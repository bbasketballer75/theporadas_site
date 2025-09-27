const sum = require('../src/utils/sum');

test('sum adds two numbers', () => {
  expect(sum(2, 3)).toBe(5);
});
