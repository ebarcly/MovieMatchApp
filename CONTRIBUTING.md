# Contributing to MovieMatchApp 🎬

First off, thank you for considering contributing to MovieMatchApp! It's people like you that make MovieMatchApp such a great tool. Here's how you can help make the app even better.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/MovieMatchApp.git
```

3. Set up the development environment:
```bash
cd MovieMatchApp
npm install
cp .env.example .env
```

4. Create a branch for your work:
```
git checkout -b feature/your-feature-name
```

### Development Environment Setup
1. Install required dependencies:

- Node.js (v14 or higher)

- npm or yarn

- Expo CLI ( npm install -g expo-cli)

- iOS Simulator / Android Emulator

2. Configure your environment variables:

- TMDB_API_KEY

- FIREBASE_CONFIG

- Other necessary API keys

### Development Process
1. Pick an issue to work on

- Look for issues labeled good first issue or help wanted

- Comment on the issue to let others know you're working on it

2. Create a feature branch

- Use descriptive names: feature/add-chat, fix/login-crash

3. Write your code

- Follow the Style Guidelines

- Add tests for new features

- Update documentation as needed

4. Commit your changes

- Use meaningful commit messages

- Reference issue numbers in commits

### How Can I Contribute?
#### Reporting Bugs
Before creating bug reports, please check the issue list to avoid duplicates. When creating a bug report, include:

- Detailed description of the issue

- Steps to reproduce

- Expected behavior

- Screenshots (if applicable)

- Environment details:

    - App version

    - Device/OS

    - React Native/Expo version

### Suggesting Enhancements
Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title

- Provide a detailed description of the proposed functionality

- Explain why this enhancement would be useful

- Include mockups or examples if possible

### Your First Code Contribution
Unsure where to begin? Look for:

- good first issue - issues that should be relatively easy to tackle

- help wanted - issues needing extra attention

- documentation - improvements to our docs

### Current Priority Areas:

- Chat System Implementation

- Recommendation Algorithm Enhancement

- UI/UX Improvements

- Test Coverage

- Performance Optimization

### Pull Requests
1. Follow all instructions in the template

2. Include screenshots and animated GIFs if relevant

3. Update documentation

4. Follow the Style Guidelines

5. Make sure all tests pass

6. Link to related issues

## Style Guidelines 
#### JavaScript/React Native Style Guide 
- Use ES6+ features

- Follow React Native best practices

- Use functional components and hooks

- Implement proper TypeScript types

- Follow the project's existing patterns

```js
// Example of preferred component structure
import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles';

interface Props {
  title: string;
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
};
```


### Commit Messages
- Use the present tense ("Add feature" not "Added feature")

- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")

- Limit the first line to 72 characters

- Reference issues and pull requests liberally after the first line

Example:
```
feat: Add chat notification system

- Implement push notifications for new messages
- Add notification settings screen
- Update user preferences handling

Fixes #123
```

### Documentation Style
- Use Markdown for documentation

- Include code examples when relevant

- Keep language clear and concise

- Update README.md when adding new features

### Community
Join our Discord server for discussions, support, and collaboration.

- [Discord Link](https://discord.gg/your-discord-link)

### Recognition
Contributors will be:

- Listed in our README.md

- Mentioned in release notes

Given credit in the app's About section

### Questions?

Feel free to contact the project maintainers if you have any questions or need further clarification.

Thank you for contributing to MovieMatchApp! 🎉
