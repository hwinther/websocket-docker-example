export default {
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.js"],
    testTimeout: 10000,
    hookTimeout: 20000,
  },
};
