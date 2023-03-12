# ndeno

[deno](https://deno.land/) 实现的 node 项目包管理命令工具

<br />

## README

[English](./README.md) | 简体中文

<br />

## 动机

希望有一个命令工具可以抹平 `npm`，`yarn`，`pnpm` 等 `node` 项目包管理器在使用时的差异。

<br />

## 举例

例如同样的安装命令，在 `npm` 中允许，但是在 `yarn` 中却报错。

```shell
npm install koa # 允许
```

```shell
yarn install koa # 报错
```

需要换成 `add`

```shell
yarn add koa # 允许
```

但是在 `pnpm` 中，`install` 和 `add` 都是允许的。

特别是在运行开源项目时，我需要不断通过记忆去判断我究竟该执行哪些命令，哪些命令是该项目不被允许的 😢

更疯狂的是我在多个项目中来回切换时，`npm`，`yarn`，`pnpm` 困扰着我。

<br />

## 使用

使用 [ndeno](https://github.com/dishait/ndeno) 是足够简单的，一切命令都被自动判断并抹平了 🥰

```shell
n # 等价于 npm install，或者 yarn 或者 pnpm install
```

```shell
n i koa # 等价于 npm install koa，或者 yarn add koa 或者 pnpm add koa
```

```shell
n dev # 等价于 npm run dev，或者 yarn dev 或者 pnpm dev
```

所有的命令都是通用的，会通过自动判断选择合适的命令，无需自己操心 🥳

<br />

## 实现

该工具是由 [deno](https://deno.land/) 构建而成的，换言之你需要先安装 👉 [deno](https://deno.land/manual@v1.28.3/getting_started/installation)

然后再执行 👇

```shell
deno install --allow-read --allow-env --allow-run --unstable -rfn n https://deno.land/x/ndeno/mod.ts
```

## License

Made with [markthree](https://github.com/markthree)

Published under [MIT License](https://github.com/dishait/ndeno/blob/main/LICENSE).
