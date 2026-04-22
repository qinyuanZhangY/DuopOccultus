const test = require("node:test");
const assert = require("node:assert/strict");
const { gradeQuestion } = require("../src/grading");

test("multiple choice grading should work", () => {
  const question = { type: "multiple_choice", answer: "A" };
  assert.equal(gradeQuestion(question, "A"), true);
  assert.equal(gradeQuestion(question, "B"), false);
});

test("fill blank grading should ignore spacing", () => {
  const question = { type: "fill_blank", answer: "牌感" };
  assert.equal(gradeQuestion(question, "牌 感"), true);
  assert.equal(gradeQuestion(question, "其他"), false);
});

test("flip card grading should compare option value", () => {
  const question = { type: "flip_card", answer: "直觉" };
  assert.equal(gradeQuestion(question, "直觉"), true);
  assert.equal(gradeQuestion(question, "行动"), false);
});

test("drag match grading should validate map pairs", () => {
  const question = {
    type: "drag_match",
    leftItems: ["A", "B"],
    correctMap: { A: "甲", B: "乙" },
  };
  assert.equal(gradeQuestion(question, { A: "甲", B: "乙" }), true);
  assert.equal(gradeQuestion(question, { A: "乙", B: "甲" }), false);
});
