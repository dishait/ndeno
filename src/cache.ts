export function creatLocalStorageRef<T extends string>(
  key: string,
) {
  let v: T
  return {
    get value() {
      return (v ??= localStorage.getItem(key) as T)
    },
    set value(nv) {
      v = nv
      localStorage.setItem(key, nv)
    },
  }
}


type AnyFunction = (...args: any) => any;

let kv: Deno.Kv;
export function useThermalFn<T extends AnyFunction>(
  fn: T,
  prefix = "ndeno",
) {
  const fnKey = fn.toString();
  const originKeys = [fnKey];
  if (prefix) {
    originKeys.unshift(prefix);
  }

  return async function invoke(
    ...rest: Parameters<T>
  ): Promise<ReturnType<T>> {
    if (!kv) {
      kv = await Deno.openKv();
    }
    const keys = [...originKeys, ...rest].flat();

    const { value } = await kv.get(keys);

    if (value) {
      return value as ReturnType<T>;
    }

    const newValue = await fn.apply(null, rest);
    kv.set(keys, newValue);

    return newValue;
  };
}