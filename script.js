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
      throw new Error(`Невідомий символ '${input[pos]}' на позиції ${pos}`);
  }
  return tokens;
}

const State = {
  START: "START",
  EXPECT_OPERAND: "EXPECT_OPERAND",
  AFTER_OPERAND: "AFTER_OPERAND",
  AFTER_OPERATOR: "AFTER_OPERATOR",
  AFTER_FUNC: "AFTER_FUNC",
  IN_FUNC_ARGS: "IN_FUNC_ARGS",
  AFTER_LPAREN: "AFTER_LPAREN",
};

function syntaxAnalyzer(tokens) {
  const errors = [];
  const parenStack = [];
  let state = State.START;
  let pos = 0;

  const current = () => (pos < tokens.length ? tokens[pos] : null);
  const prev = () => (pos > 0 ? tokens[pos - 1] : null);
  const addError = (msg, token = current()) => {
    if (token) {
      errors.push({ position: token.position, message: msg });
    } else {
      errors.push({
        position: tokens[tokens.length - 1]?.position || 0,
        message: msg,
      });
    }
  };

  const isOperand = (t) =>
    t && ["number", "variable", "constant"].includes(t.type);
  const isUnary = (t) =>
    t && t.type === "operator" && ["+", "-"].includes(t.value);

  while (pos < tokens.length) {
    const token = current();

    switch (state) {
      case State.START:
        if (isOperand(token)) {
          state = State.AFTER_OPERAND;
        } else if (token.type === "func") {
          state = State.AFTER_FUNC;
        } else if (token.type === "lparen") {
          parenStack.push(token.position);
          state = State.AFTER_LPAREN;
        } else if (isUnary(token)) {
          state = State.AFTER_OPERATOR;
        } else if (token.type === "operator") {
          addError(`Вираз не може починатись з оператора '${token.value}'`);
          state = State.AFTER_OPERATOR;
        } else if (token.type === "rparen") {
          addError("Неочікувана закриваюча дужка на початку виразу");
        }
        break;

      case State.AFTER_OPERAND:
        if (token.type === "operator") {
          state = State.AFTER_OPERATOR;
        } else if (token.type === "rparen") {
          if (parenStack.length === 0) {
            addError("Закриваюча дужка не має парної відкриваючої");
          } else {
            parenStack.pop();
          }
        } else if (token.type === "lparen") {
          addError("Пропущено оператор перед дужкою");
          parenStack.push(token.position);
          state = State.AFTER_LPAREN;
        } else if (isOperand(token) || token.type === "func") {
          addError("Пропущено оператор між операндами");
          state =
            token.type === "func" ? State.AFTER_FUNC : State.AFTER_OPERAND;
        }
        break;

      case State.AFTER_OPERATOR:
        if (isOperand(token)) {
          state = State.AFTER_OPERAND;
        } else if (token.type === "func") {
          state = State.AFTER_FUNC;
        } else if (token.type === "lparen") {
          parenStack.push(token.position);
          state = State.AFTER_LPAREN;
        } else if (isUnary(token)) {
        } else if (token.type === "operator") {
          addError(`Подвійний оператор '${prev().value}' та '${token.value}'`);
        } else if (token.type === "rparen") {
          addError(`Закриваюча дужка після оператора '${prev().value}'`);
          if (parenStack.length > 0) parenStack.pop();
          state = State.AFTER_OPERAND;
        }
        break;

      case State.AFTER_FUNC:
        if (token.type === "lparen") {
          parenStack.push(token.position);
          state = State.IN_FUNC_ARGS;
        } else {
          addError(`Очікувалась '(' після функції '${prev().value}'`);
        }
        break;

      case State.IN_FUNC_ARGS:
        if (isOperand(token)) {
          state = State.AFTER_OPERAND;
        } else if (token.type === "func") {
          state = State.AFTER_FUNC;
        } else if (token.type === "lparen") {
          parenStack.push(token.position);
          state = State.AFTER_LPAREN;
        } else if (isUnary(token)) {
          state = State.AFTER_OPERATOR;
        } else if (token.type === "rparen") {
          if (parenStack.length > 0) parenStack.pop();
          state = State.AFTER_OPERAND;
        }
        break;

      case State.AFTER_LPAREN:
        if (isOperand(token)) {
          state = State.AFTER_OPERAND;
        } else if (token.type === "func") {
          state = State.AFTER_FUNC;
        } else if (token.type === "lparen") {
          parenStack.push(token.position);
        } else if (isUnary(token)) {
          state = State.AFTER_OPERATOR;
        } else if (
          token.type === "operator" &&
          ["^", "*", "/"].includes(token.value)
        ) {
          addError(`Оператор '${token.value}' після відкритої дужки`);
          state = State.AFTER_OPERATOR;
        } else if (token.type === "rparen") {
          const p = prev();
          if (
            p &&
            p.type === "lparen" &&
            pos >= 2 &&
            tokens[pos - 2].type !== "func"
          ) {
            addError("Порожні дужки не дозволені");
          }
          if (parenStack.length > 0) parenStack.pop();
          state = State.AFTER_OPERAND;
        }
        break;
    }
    pos++;
  }

  if (state === State.AFTER_OPERATOR) {
    addError("Вираз не може закінчуватись оператором");
  } else if (state === State.AFTER_FUNC) {
    addError("Функція без дужок");
  }

  parenStack.forEach((p) => {
    errors.push({ position: p, message: `Незакрита дужка` });
  });

  return {
    valid: errors.length === 0,
    errors: errors.sort((a, b) => a.position - b.position),
  };
}

function analyzeExpression(input) {
  console.log(`\nВираз: "${input}"`);

  try {
    const tokens = lexAnalyzer(input);
    const result = syntaxAnalyzer(tokens);

    if (result.valid) {
      console.log("вираз правильний\n");
    } else {
      console.log(" Помилки:");
      result.errors.forEach((err) => {
        console.log(`  [${err.position}] ${err.message}`);
      });
      console.log();
    }
  } catch (error) {
    console.log(`Лексична помилка: ${error.message}\n`);
  }
}

const tests = ["*3+5", ")x+5", "(5*4+)3", "2***4"];

console.log("Аналіз виразів:");
tests.forEach((expr) => analyzeExpression(expr));
