// jest.config.js
module.exports = {
    testEnvironment: 'node',           // We're testing Node.js code
    roots: ['<rootDir>/tests'],       // Where test files live
    testMatch: [
        '**/*.test.js',                 // Files ending in .test.js
        '**/*.spec.js'                  // Files ending in .spec.js
    ],
    verbose: true,                     // Show individual test results
    collectCoverageFrom: [            // Which files to check coverage
        'src/services/**/*.js',
        'src/utils/**/*.js',
        'src/controllers/**/*.js',
    ],
    coverageDirectory: 'coverage',    // Where coverage report goes
    setupFilesAfterSetup: [],         // Files to run before tests
};