#!/usr/bin/env node

/*
* Define CLI commands with options and arguments
* */
const commands = {
  // todo add boilerplate creator
  // new: {},
  build: {
    aliases: ['b'],
    description: 'Build Swayer components.',
    options: {
      '--args': {
        aliases: ['-a'],
        description: 'Pass component arguments as JSON string.',
      },
      '--pretty': {
        aliases: ['-p'],
        description: 'Prettify HTML output.',
      },
      '--swayerUrl': {
        // TODO: replace <CDN> with real cdn url
        description: 'Swayer script url. Defaults to <CDN>',
      },
      '--ssr': {
        description: 'Enable server side rendering.',
      },
    },
    arguments: [
      {
        name: 'path',
        description: 'Swayer component schema path.',
      },
    ],
    execute: async (config) => {
      const module = await import('../lib/platforms/server.js');
      await module.default.build(config);
    },
  },
};

/*
* Define CLI colors
* Usage: colors.green(str) or colors.green`str`
* */
const colors = {
  green: (str) => `\x1b[32m${str}\x1b[0m`,
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
  else if (!optionName || stopGettingOptions) return options;
  else options[optionName.slice(2)] = getOptionValue(args[i + 1]);
  return options;
};

const makeArguments = (args, inputArg, i) => {
  const argName = command?.arguments[i]?.name;
  if (!argName) return args;
  args[argName] = inputArg;
  return args;
};

const options = inputArgs.filter(isOption).reduce(makeOptions, {});
const args = inputArgs.filter(isArgument).reduce(makeArguments, {});

// Exit
if (Object.keys(args).length === 0) printCommandHelp(commandName, command);

const config = { ...args, ...options };
void command.execute(config);
