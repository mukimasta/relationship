/** 启动时 DOM 必须存在；缺失则立即失败，便于发现问题。 */
export function getEl<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as unknown as T;
}
