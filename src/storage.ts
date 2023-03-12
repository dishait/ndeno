export function creatLocalStorageRef<T extends string>(
	key: string
) {
	let v: T
	return {
		get value() {
			return (v ??= localStorage.getItem(key) as T)
		},
		set value(nv) {
			v = nv
			localStorage.setItem(key, nv)
		}
	}
}
