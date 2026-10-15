/**
 * SQL formatter. A tokenizer plus layout rules — it only moves whitespace and
 * keyword case around, so the database parses exactly what it parsed before.
 */

export type KeywordCase = "upper" | "lower" | "preserve";

export interface SqlOptions {
  keywordCase: KeywordCase;
  indent: string;
  minify: boolean;
}

export interface SqlRead {
  output: string;
  error: string | null;
}

type Kind = "word" | "string" | "number" | "punct" | "comment";

interface Token {
  kind: Kind;
  value: string;
  upper: string;
}

const KEYWORDS = new Set(
  `select from where group by having order asc desc limit offset insert into values update set delete
   create table alter drop add column rename primary key foreign references unique index view materialized
   inner outer left right full cross natural join using union all intersect except distinct on as is not null
   and or between like ilike glob regexp in exists case when then else end cast default constraint check
   begin commit rollback transaction savepoint with recursive returning if replace temp temporary virtual
   without conflict abort fail ignore immediate deferred initially deferrable autoincrement
   true false current_date current_time current_timestamp collate collation explain query plan analyze
   attach detach pragma vacuum reindex truncate grant revoke for each row after before instead
   integer int bigint smallint tinyint numeric decimal float double real boolean bool char varchar text blob
   date datetime time timestamp uuid json serial unsigned varying national clob nclob bit
   binary varbinary money smallmoney uniqueidentifier ntext nchar nvarchar interval array struct
   count sum avg min max abs ceil ceiling floor round coalesce nullif ifnull iif concat substr substring
   trim ltrim rtrim upper lower length instr replace printf format group_concat row_number rank dense_rank
   percent_rank cume_dist ntile lag lead first_value last_value nth_value json_extract json_each
   json_group_array escape over partition rows range preceding following current unbounded exclude`
    .split(/\s+/)
    .map((word) => word.toUpperCase()),
);

/** Words that open a clause and therefore start a line. */
const CLAUSES = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "HAVING", "ORDER", "LIMIT", "OFFSET", "UNION",
  "INTERSECT", "EXCEPT", "INSERT", "UPDATE", "DELETE", "SET", "VALUES", "WITH",
  "RETURNING", "ON", "USING", "CONFLICT",
]);

const JOIN_WORDS = new Set(["JOIN", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL", "OUTER"]);

/** Words after which a clause word belongs on the same line. */
const GLUE = new Set([
  "GROUP", "ORDER", "UNION", "INTERSECT", "EXCEPT", "ALL", "DISTINCT", "SELECT", "INSERT",
  "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "BY", "OF", "IN", "IS", "AND", "OR", "NOT",
  "AS", "CASE", "WHEN", "THEN", "ELSE", "END", "ON", "JOIN", "INTO", "SET", "VALUES", "WHERE",
  "HAVING", "WITH", "RETURNING", "USING", "INNER", "LEFT", "RIGHT", "FULL", "CROSS", "NATURAL",
  "OUTER", "IF", "EXISTS", "BETWEEN", "LIKE", "THEN", "ELSE", "WHILE", "PERFORM",
]);

/** Function names: `count(*)` keeps no space before the bracket. */
const FUNCTIONS = new Set(
  `count sum avg min max abs ceil ceiling floor round coalesce nullif ifnull iif concat substr
   substring trim ltrim rtrim upper lower length instr replace printf format group_concat
   row_number rank dense_rank percent_rank cume_dist ntile lag lead first_value last_value
   nth_value json_extract json_each json_group_array random cast if charindex len getdate
   dateadd datediff datepart convert try_convert`
    .split(/\s+/)
    .map((word) => word.toUpperCase()),
);

class Scanner {
  private readonly source: string;
  private at = 0;

  constructor(source: string) {
    this.source = source;
  }

  private fail(message: string): never {
    throw new Error(`${message} (character ${this.at + 1})`);
  }

  private peek(offset = 0): string {
    return this.source[this.at + offset] ?? "";
  }

  private mark(): number {
    return this.at;
  }

  private slice(start: number): Token {
    const value = this.source.slice(start, this.at);
    return { kind: "number", value, upper: "" };
  }

  tokens(): Token[] {
    const out: Token[] = [];
    while (this.at < this.source.length) {
      const char = this.peek();
      if (/\s/.test(char)) {
        this.at++;
        continue;
      }
      if (char === "-" && this.peek(1) === "-") {
        const start = this.mark();
        while (this.at < this.source.length && this.peek() !== "\n") this.at++;
        out.push({ kind: "comment", value: this.source.slice(start, this.at), upper: "" });
        continue;
      }
      if (char === "/" && this.peek(1) === "*") {
        const start = this.mark();
        this.at += 2;
        for (;;) {
          if (this.at >= this.source.length) this.fail("Block comment never closes");
          if (this.peek() === "*" && this.peek(1) === "/") {
            this.at += 2;
            break;
          }
          this.at++;
        }
        out.push({ kind: "comment", value: this.source.slice(start, this.at), upper: "" });
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        const value = this.readQuoted(char);
        out.push({ kind: char === "'" ? "string" : "word", value, upper: "" });
        continue;
      }
      if (char === "[" && /[^\]\s]/.test(this.peek(1))) {
        const start = this.mark();
        this.at++;
        while (this.at < this.source.length && this.peek() !== "]") this.at++;
        if (this.peek() !== "]") this.fail("Bracketed name never closes");
        this.at++;
        out.push({ kind: "word", value: this.source.slice(start, this.at), upper: "" });
        continue;
      }
      if (/[A-Za-z_]/.test(char) || char.codePointAt(0)! > 127) {
        const start = this.mark();
        while (/[A-Za-z0-9_]/.test(this.peek()) || this.peek().codePointAt(0)! > 127) this.at++;
        const value = this.source.slice(start, this.at);
        out.push({ kind: "word", value, upper: value.toUpperCase() });
        continue;
      }
      if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(this.peek(1)))) {
        const start = this.mark();
        if (char === "0" && /[xX]/.test(this.peek(1))) {
          this.at += 2;
          while (/[0-9a-fA-F]/.test(this.peek())) this.at++;
        } else {
          while (/[0-9]/.test(this.peek())) this.at++;
          if (this.peek() === ".") {
            this.at++;
            while (/[0-9]/.test(this.peek())) this.at++;
          }
          if (/[eE]/.test(this.peek())) {
            this.at++;
            if (/[+-]/.test(this.peek())) this.at++;
            while (/[0-9]/.test(this.peek())) this.at++;
          }
        }
        out.push({ kind: "number", value: this.source.slice(start, this.at), upper: "" });
        continue;
      }
      if (char === "?" || ((char === ":" || char === "$") && /[A-Za-z0-9_]/.test(this.peek(1)))) {
        const start = this.mark();
        this.at++;
        while (/[A-Za-z0-9_]/.test(this.peek())) this.at++;
        out.push(this.slice(start));
        continue;
      }
      const two = this.source.slice(this.at, this.at + 3);
      if (two === "->>") {
        this.at += 3;
        out.push({ kind: "punct", value: two, upper: two });
        continue;
      }
      const pair = this.source.slice(this.at, this.at + 2);
      if (["<=", ">=", "<>", "!=", "||", "::", "->", ":=", "**"].includes(pair)) {
        this.at += 2;
        out.push({ kind: "punct", value: pair, upper: pair });
        continue;
      }
      if ("(),;.*+=/<>-~!|%&^{}".includes(char)) {
        this.at++;
        out.push({ kind: "punct", value: char, upper: char });
        continue;
      }
      this.fail(`Unexpected character "${char}"`);
    }
    return out;
  }

  private readQuoted(quote: string): string {
    const start = this.at;
    this.at++;
    while (this.at < this.source.length) {
      if (this.peek() === quote) {
        if (quote === "'" && this.peek(1) === quote) {
          this.at += 2;
          continue;
        }
        this.at++;
        return this.source.slice(start, this.at);
      }
      if (this.peek() === "\n" && quote !== "`") this.fail("Text ends inside a quoted value");
      this.at++;
    }
    return this.fail("Quoted value never closes");
  }
}

function cased(token: Token, options: SqlOptions): string {
  if (token.kind !== "word" || !KEYWORDS.has(token.upper)) return token.value;
  if (options.keywordCase === "upper") return token.value.toUpperCase();
  if (options.keywordCase === "lower") return token.value.toLowerCase();
  return token.value;
}

export function formatSql(text: string, options: SqlOptions): SqlRead {
  let tokens: Token[];
  try {
    tokens = new Scanner(text).tokens();
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : String(err) };
  }
  if (tokens.length === 0) return { output: "", error: null };

  const indent = options.indent;
  let out = "";
  let level = 0;
  let caseLevel = 0;
  let prev = "";
  let lastCloseSub = false;
  const stack: { level: number; sub: boolean }[] = [];

  const fresh = () => out === "" || /\n[ \t]*$/.test(out);
  const breakTo = (depth: number) => {
    out = `${out.replace(/[ \t]+$/, "")}\n${indent.repeat(Math.max(0, depth))}`;
  };
  const emit = (value: string, spaceBefore: boolean) => {
    if (spaceBefore && !fresh() && !/[ (.]$/.test(out)) out += " ";
    out += value;
  };
  /** Word at the end of the line so far, used to space brackets. */
  const trailingWord = (): string | undefined =>
    /([A-Za-z_][A-Za-z0-9_]*)$/.exec(out.replace(/[ \t]+$/, ""))?.[1]?.toUpperCase();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "comment") {
      let value = token.value;
      if (options.minify && value.startsWith("--")) value = `/*${value.slice(2)}*/`;
      if (!fresh()) breakTo(level);
      out += value;
      breakTo(level);
      prev = "";
      continue;
    }

    if (token.kind === "punct") {
      if (token.value === "(") {
        const next = tokens[i + 1]?.upper ?? "";
        const sub = next === "SELECT" || next === "WITH";
        if (fresh()) {
          out += "(";
        } else {
          // Only a function name sits flush against its brackets.
          const word = trailingWord();
          const gap = word && !FUNCTIONS.has(word) ? " " : "";
          out = `${out.replace(/[ \t]+$/, "")}${gap}(`;
        }
        stack.push({ level, sub });
        if (sub) {
          level++;
          breakTo(level);
        }
        prev = "(";
        continue;
      }
      if (token.value === ")") {
        const frame = stack.pop();
        if (!frame)
          return { output: "", error: "Closing parenthesis without a matching opening one" };
        level = frame.level;
        lastCloseSub = frame.sub;
        if (frame.sub && !fresh()) breakTo(level);
        else if (!out.endsWith("(")) out = out.replace(/[ \t]+$/, "");
        out += ")";
        prev = ")";
        continue;
      }
      if (token.value === ",") {
        out = `${out.replace(/[ \t]+$/, "")},`;
        // A list is one line per entry once one of its entries spans lines.
        if (lastCloseSub && !options.minify) breakTo(level);
        else if (!options.minify) out += " ";
        lastCloseSub = false;
        prev = ",";
        continue;
      }
      if (token.value === ";") {
        out = `${out.replace(/[ \t]+$/, "")};`;
        prev = ";";
        if (i + 1 < tokens.length) breakTo(0);
        continue;
      }
      if (token.value === ".") {
        out = `${out.replace(/[ \t]+$/, "")}.`;
        prev = ".";
        continue;
      }
      emit(token.value, !["*", "."].includes(token.value) && prev !== "(");
      out += " ";
      prev = token.value;
      continue;
    }

    const upper = token.upper;
    const keyword = KEYWORDS.has(upper);
    const startsLine =
      (CLAUSES.has(upper) || JOIN_WORDS.has(upper)) && !GLUE.has(prev) && !fresh();

    if (startsLine) breakTo(level);
    if (upper === "CASE") caseLevel++;
    if ((upper === "WHEN" || upper === "ELSE") && !fresh()) breakTo(level + Math.max(1, caseLevel));
    if (upper === "END") {
      if (caseLevel > 0) caseLevel--;
      if (!fresh()) breakTo(level);
    }

    emit(cased(token, options), true);
    out += " ";
    prev = keyword ? upper : token.value;
  }

  if (stack.length > 0)
    return { output: "", error: `Unclosed parenthesis: ${stack.length} still open at the end` };

  const formatted = out
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .filter((l) => l.trim() !== "")
    .join("\n");
  if (options.minify) return { output: formatted.replace(/\s+/g, " ").trim(), error: null };
  return { output: `${formatted.trimEnd()}\n`, error: null };
}
