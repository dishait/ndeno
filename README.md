# ndeno

js runtime project management tool

<br />

## README

English | [简体中文](./README_CN.md)

<br />

## Motivation

I wish there was a command tool that could smooth out the differences between
`npm`, `yarn`, `pnpm`, and other `node` project package managers, and `deno`
when used.

<br />

## Usage

### install

```shell
deno install --allow-read --allow-env --allow-run --allow-write -rfn n https://deno.land/x/ndeno/mod.ts
```

Of course, if you don't have Deno installed 👇

```shell
npx deno-npx install --allow-read --allow-env --allow-run --allow-write -rfn n https://deno.land/x/ndeno/mod.ts
```

### nodejs

you can use `npm install ndeno -g` to install `ndeno` globally. (In a pure
nodejs environment)

### daily

Automatically determine the package manager of the project, without worrying

```shell
n # Amount to npm install
```

```shell
n i express # Amount to npm install express
```

```shell
n dev # Amount to npm run dev
```

```shell
n -h # View current usage information
```

### uinstall

```shell
deno uninstall n
```

<br />

## License

Made with [markthree](https://github.com/markthree)

Published under [MIT License](./LICENSE).
