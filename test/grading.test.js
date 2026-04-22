const test = require("node:test");
const assert = require("node:assert/strict");
const { gradeLesson } = require("../src/grading");

test("gradeLesson should score all supported question types", () => {
  const lesson = {
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        answer: "A",
      },
      {
        id: "q2",
        type: "fill_blank",
        answer: "蓝色",
      },
      {
        id: "q3",
        type: "flip_card",
        answer: "直觉",
      },
      {
        id: "q4",
        type: "drag_match",
        leftItems: ["左1", "左2"],
        correctMap: {
          左1: "右1",
          左2: "右2",
        },
      },
    ],
  };

  const responses = {
    q1: "A",
    q2: "蓝 色",
    q3: "直觉",
    q4: {
      左1: "右1",
      左2: "右2",
    },
  };

  const result = gradeLesson(lesson, responses);
  assert.equal(result.total, 4);
  assert.equal(result.correct, 4);
  assert.equal(result.details.length, 4);
  assert.ok(result.details.every((item) => item.correct));
});

test("gradeLesson should mark missing answers as incorrect", () => {
  const lesson = {
    questions: [
      { id: "q1", type: "multiple_choice", answer: "A" },
      { id: "q2", type: "fill_blank", answer: "B" },
    ],
  };

  const result = gradeLesson(lesson, { q1: "A" });
  assert.equal(result.total, 2);
  assert.equal(result.correct, 1);
  assert.equal(result.details[1].correct, false);
});
