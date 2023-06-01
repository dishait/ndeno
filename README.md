# ndeno

Command line tool created by [deno](https://deno.land/) to manage node projects
(Unified)

<br />

## README

English | [简体中文](./README_CN.md)

<br />

## Motivation

I hope there is a tool to help me block out npm, yarn and pnpm to manage node
projects

<br />

## Usage

### install

```shell
deno install --allow-read --allow-env --allow-run --allow-write --unstable -rfn n https://deno.land/x/ndeno/mod.ts
```

Of course, if you don't have Deno installed 👇

```shell
npx deno-npx install --allow-read --allow-env --allow-run --allow-write --unstable -rfn n https://deno.land/x/ndeno/mod.ts
```

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
