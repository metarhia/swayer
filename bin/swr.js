#!/usr/bin/env node
import Builder from '../lib/cli/builder.js';
import HttpServer from '../lib/cli/httpServer.js';

/*
* Define CLI colors
* Usage: colors.green(str) or colors.green`str`
* */
const colors = {
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  green: (str) => `\x1b[32m${str}\x1b[0m`,
};

/*
* Define CLI commands with options and arguments
* */
const renderOptions = {
  '--input': {
    aliases: ['-i'],
    description: 'Pass component input data as JSON string.',
    parseAsJson: true,
  },
  '--pretty': {
    description: 'Prettify HTML output files.',
  },
  '--ssr': {
    description: 'Enable server side rendering.',
  },
};

const commands = {
  create: {
    aliases: ['new', 'c'],
    description: 'Create Swayer starter application.',
    options: {},
    arguments: [
      {
        name: 'name',
        description: 'New application name.',
      },
    ],
    execute: async ({ ssr, pretty, name }) => {
      console.log(colors.green('\nCreating new Swayer application...\n'));
      const platformOptions = { ssr, pretty };
      await new Builder(platformOptions).createStarter(name);
      console.log(colors.green('Done!\n'));
    },
  },
  build: {
    aliases: ['b'],
    description: 'Build Swayer application.',
    options: {
      '--env': {
        aliases: ['-e'],
        description: 'Set environment, e.g. ' +
        `'production' will use 'env.production.js' file. ` +
        `Defaults to 'development'.`,
      },
      '--production': {
        aliases: ['--prod'],
        description: 'Make production-ready build.',
      },
      '--output': {
        aliases: ['-o'],
        description: 'Path to build output directory. Defaults to ./dist.',
      },
    },
    arguments: [
      {
        name: 'path',
        description: 'Path to application directory. ' +
        'Defaults to current directory.',
      },
    ],
    execute: async ({ ssr, pretty, production, ...buildOptions }) => {
      console.log(colors.green('\nBuilding Swayer application...\n'));
      const platformOptions = { ssr, pretty, production };
      if (production) buildOptions.env = 'production';
      await new Builder(platformOptions).build(buildOptions);
      console.log(colors.green('Done!\n'));
    },
  },
  render: {
    aliases: ['r'],
    description: 'Render Swayer component.',
    options: {
      ...renderOptions,
      '--route': {
        description: 'Path to be routed inside Swayer components. ' +
          `Defaults to '/'.`,
      },
      '--output': {
        aliases: ['-o'],
        description: 'Path to HTML output file. ' +
        'Defaults to same as component schema file path, ' +
        'but with .html extension.',
      },
    },
    arguments: [
      {
        name: 'path',
        description: 'Path to component schema file.',
      },
    ],
    execute: async ({ ssr, pretty, ...renderOptions }) => {
      if (!renderOptions.path) {
        const msg = '\nError: path to component schema file is not provided!';
        console.log(colors.red(msg));
        return;
      }
      console.log(colors.green('\nRendering Swayer component...\n'));
      const platformOptions = { ssr, pretty };
      await new Builder(platformOptions).render(renderOptions);
      console.log(colors.green('Done!\n'));
    },
  },
  serve: {
    aliases: ['s'],
    description: 'Serve Swayer application.',
    options: {
      ...renderOptions,
      '--host': {
        aliases: ['-h'],
        description: `Set server host. Defaults to '127.0.0.1'.`,
      },
      '--port': {
        aliases: ['-p'],
        description: `Set server port. Defaults to '8000'`,
      },
    },
    arguments: [
      {
        name: 'path',
        description: 'Path to application directory. ' +
        'Defaults to current directory.',
      },
    ],
    execute: ({ ssr, pretty, ...serverOptions }) => {
      console.log(colors.green('\nWelcome to Swayer dev server!'));
      console.log('\n-- DO NOT USE IN PRODUCTION --\n');
      const platformOptions = { ssr, pretty };
      return new HttpServer(platformOptions).start(serverOptions);
    },
  },
};

/*
* Define CLI messages
* */
const printCollection = (type, collection) => {
  let str = `${type}:\n`;
  for (const name of Object.keys(collection)) {
    const { aliases, description } = collection[name];
    const title = type === 'arguments' ? collection[name].name : name;
    str += `  ${colors.green(title)} `;
    if (aliases?.length) str += `(${aliases.join(', ')}) `;
    if (description) str += `- ${description}`;
    str += '\n';
  }
  return str.slice(0, -1);
};

const printCommands = (commands) => printCollection('commands', commands);
const printArguments = (args) => printCollection('arguments', args);
const printOptions = (options) => printCollection('options', options);

const printCLIHelp = (commands) => {
  console.log(`Welcome to Swayer CLI!

Usage: swr [command] [arguments] [options]

Available ${printCommands(commands)}

For more detailed help run 'swr [command] --help'
  `);
  process.exit(0);
};

const printCommandHelp = (commandName, command) => {
  console.log(`Usage: swr ${commandName} [arguments] [options]

Available ${printArguments(command.arguments)}

Available ${printOptions(command.options)}
  ${colors.green('--help')} (-h) - Display this usage info.
  `);
  process.exit(0);
};

/*
* Run CLI flow
* */
const normalize = (args) => args.reduce((normalized, arg) => {
  if (arg.includes('=')) normalized.push(...arg.split('='));
  else normalized.push(arg);
  return normalized;
}, []);

const inputArgs = normalize(process.argv.slice(2));

// Exit
if (inputArgs.length === 0) printCLIHelp(commands);

const getCommandName = (collection) => Object.keys(collection).find(
  (name) => inputArgs.includes(name) || inputArgs.some(
    (arg) => collection[name]?.aliases?.includes(arg),
  ),
);

const commandName = getCommandName(commands);

// Exit
if (!commandName) printCLIHelp(commands);

const command = commands[commandName];

// Exit
const help = inputArgs.includes('--help') || inputArgs.includes('-h');
if (help) printCommandHelp(commandName, command);

const isOption = (arg, i, args) => (
  arg.startsWith('-') || args[i - 1]?.startsWith('-')
);
const isArgument = (arg, i, args) => (
  arg !== commandName
  && !command.aliases.includes(arg)
  && !isOption(arg, i, args)
);
const getOptionName = (arg) => Object.keys(command.options).find(
  (name) => name === arg || command.options[name]?.aliases?.includes(arg),
);
const getOptionValue = (arg) => (
  arg === undefined || arg.startsWith('-') || arg
);

let stopGettingOptions = false;

const makeOptions = (options, arg, i, args) => {
  const optionName = getOptionName(arg);
  if (arg === '--') stopGettingOptions = true;
  if (!optionName || stopGettingOptions) return options;
  const parseAsJson = command.options[optionName]?.parseAsJson;
  const value = getOptionValue(args[i + 1]);
  options[optionName.slice(2)] = parseAsJson ? JSON.parse(value) : value;
  return options;
};

const makeArguments = (args, inputArg, i) => {
  const argName = command.arguments[i]?.name;
  if (!argName) return args;
  const parseAsJson = command.arguments[i]?.parseAsJson;
  args[argName] = parseAsJson ? JSON.parse(inputArg) : inputArg;
  return args;
};

const options = inputArgs.filter(isOption).reduce(makeOptions, {});
const args = inputArgs.filter(isArgument).reduce(makeArguments, {});

const config = { ...args, ...options };
void command.execute(config);
