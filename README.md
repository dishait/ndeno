# ndeno

Command line tool created by [deno](https://deno.land/) to manage node projects (Unified)

<br />

## README

English | [简体中文](./README_CN.md)

<br />

## Motivation

I hope there is a tool to help me block out npm, yarn and pnpm to manage node projects

<br />

## Usage

### install

```shell
deno install --allow-read --allow-env --allow-run --unstable -rfn n https://deno.land/x/ndeno/mod.ts
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
n i -a # Automatically deep file dependencies and install
```

```shell
n dev # Amount to npm run dev
```

```shell
n here # Detect the project manager of the current directory
```

```shell
n refresh pnpm # Switch package manager to pnpm
```

### uinstall

```shell
deno uninstall n
```

<br />

## License

Made with [markthree](https://github.com/markthree)

Published under [MIT License](./LICENSE).
