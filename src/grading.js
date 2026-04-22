function normalizeText(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function gradeQuestion(question, response) {
  if (!question) {
    return false;
  }

  if (question.type === "multiple_choice" || question.type === "flip_card") {
    return normalizeText(response) === normalizeText(question.answer);
  }

  if (question.type === "fill_blank") {
    return normalizeText(response) === normalizeText(question.answer);
  }

  if (question.type === "drag_match") {
    if (!response || typeof response !== "object") {
      return false;
    }

    return question.leftItems.every((leftItem) => {
      const expected = question.correctMap[leftItem];
      return normalizeText(response[leftItem]) === normalizeText(expected);
    });
  }

  return false;
}

function gradeLesson(lesson, responsesByQuestionId) {
  const result = {
    total: lesson.questions.length,
    correct: 0,
    details: [],
  };

  lesson.questions.forEach((question) => {
    const userResponse = responsesByQuestionId[question.id];
    const isCorrect = gradeQuestion(question, userResponse);
    if (isCorrect) {
      result.correct += 1;
    }
    result.details.push({
      questionId: question.id,
      correct: isCorrect,
      response: userResponse ?? null,
    });
  });

  return result;
}

module.exports = {
  gradeQuestion,
  gradeLesson,
};
