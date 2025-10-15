const TOKEN = [
  ["number", /\d+(\.\d+)?/y],
  ["func", /\b(sin|cos|tan)\b/y],
  ["constant", /\b(pi|e)\b/y],
  ["variable", /[a-zA-Z_]\w*/y],
  ["operator", /[+\-*\/^]/y],
  ["lparen", /\(/y],
  ["rparen", /\)/y],
  ["whitespace", /\s+/y],
];

function lexAnalyzer(input) {
  const tokens = [];
  let pos = 0;

  while (pos < input.length) {
    let match = null;
    for (const [type, regex] of TOKEN) {
      regex.lastIndex = pos;
      const result = regex.exec(input);
      if (result) {
        match = { type, value: result[0], position: pos };
        pos = regex.lastIndex;
        if (type !== "whitespace") tokens.push(match);
        break;
      }
    }
    if (!match)
      throw new Error(
        `unexpected character input '${input[pos]}' at position ${pos}`
      );
  }
  return tokens;
}

console.log(lexAnalyzer("3 + cos(pi)"));

function syntaxAnalyzer(tokens, input) {
  const errors = [];
  let parenthesis = [];
  let prev = null;

  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];

    if (i == 0) {
      if (curr.type === "operator" || curr.type === "rparen") {
        errors.push({
          msg: `Вираз не може починатися з '${curr.value}' at position ${curr.position}`,
          position: curr.position,
        });
      }
    }

    if (curr.type === "lparen") {
      parenthesis.push(curr.position);
    } else if (curr.type === "rparen") {
      if (parenthesis.length === 0) {
        errors.push({
          msg: `Зайва закрита дужка ')'`,
          position: curr.position,
        });
      } else {
        parenthesis.pop();
      }
    }

    if (prev) {
      if (prev.type === "operator" && curr.type === "operator") {
        errors.push({
          msg: `Кілька операторів підряд '${prev.value}${curr.value}'`,
          position: curr.position,
        });
      }
      if (prev.type === "number" && curr.type === "lparen") {
        errors.push({
          msg: `Відсутній оператор між числом і дужкою `,
          postion: curr.position,
        });
      }
      if (prev.type === "rparen" && curr.type === "number") {
        errors.push({
          msg: `Відсутній оператор між дужкою і числом`,
          position: curr.position,
        });
      }
      if (prev.type === "variable" && curr.type === "lparen") {
        errors.push({
          msg: `Відсутній оператор між змінною і дужкою`,
          position: curr.position,
        });
      }
      if (prev.type === "rparen" && curr.type === "variable") {
        errors.push({
          msg: `Відсутній оператор між дужкою і змінною`,
          position: curr.position,
        });
      }
      if (prev.type === "lparen" && curr.type === "rparen") {
        errors.push({ msg: `Порожні дужки '()'`, position: curr.position });
      }
      if (prev.type === "operator" && curr.type === "rparen") {
        errors.push({
          msg: `Відсутній операнд перед дужкою ')'`,
          position: curr.position,
        });
      }
      if (prev.type === "lparen" && curr.type === "operator") {
        errors.push({
          msg: `Відсутній операнд після дужки '('`,
          position: curr.position,
        });
      }
    }
    prev = curr;
  }

  const lastToken = tokens[tokens.length - 1];
  if (lastToken?.type === "operator" || lastToken?.type === "lparen") {
    errors.push(
      `Вираз не може закінчуватися на '${lastToken.value}' at position ${lastToken.position}`
    );
  }

  while (parenthesis.length > 0) {
    errors.push({
      msg: `Незакрита дужка '('`,
      position: parenthesis.pop(),
    });
  }

  if (errors.length) {
    console.log("Синтаксичні помилки:");
    errors.forEach((error) => {
      console.log(`${error.msg} at position ${error.position}`);
      console.log(input);
      console.log(" ".repeat(error.position) + "^");
      console.log();
    });
  } else {
    console.log("Синтаксичних помилок не знайдено.");
  }
}

const input = "sin() + cos(y)";
const tokens = lexAnalyzer(input);
syntaxAnalyzer(tokens, input);
