# ndeno

Command line tool created by [deno](https://deno.land/) to manage node projects (Unified)

<br />

## Motivation

I hope there is a tool to help me block out npm, yarn and pnpm to manage node projects

<br />

## Usage

### install

```shell
deno install --allow-read --allow-env --allow-run -n n https://deno.land/x/ndeno/mod.ts
```

### uinstall

```shell
deno uninstall n
```

### daily

#### install

Automatically determine the package manager of the project, without worrying

```shell
n # amount to npm install
```

```shell
n i express # amount to npm install express
```

```shell
n dev # amount to npm run dev
```

<br />

## License

Made with [markthree](https://github.com/markthree)

Published under [MIT License](./LICENSE).
