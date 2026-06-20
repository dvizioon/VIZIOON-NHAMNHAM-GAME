/**
 * Proteção contra duplicação de cenas no Phaser 4.
 *
 * Por quê: o Phaser não aguarda um `create()` assíncrono. Assim que a parte
 * síncrona retorna (no primeiro `await`), a cena já é marcada como RUNNING.
 * Se um novo `start()` da mesma cena chegar nesse meio-tempo, o Phaser faz
 * shutdown + restart e o `create()` antigo continua rodando após o `await`,
 * construindo um segundo conjunto de objetos (telas/cards/paginação em dobro).
 *
 * `beginSceneRun` marca um token único por execução de `create()`. Depois de
 * cada `await`, use `isStaleRun` para abortar continuações de uma execução que
 * já foi substituída por um restart — algo que `sys.isActive()` sozinho não
 * detecta (após o restart a cena volta a ficar ativa).
 */
export function beginSceneRun(scene) {
  scene._navLock = false;
  scene._runToken = (scene._runToken || 0) + 1;
  return scene._runToken;
}

/** True se a execução de create() representada por `token` não é mais a atual. */
export function isStaleRun(scene, token) {
  return !scene?.sys || !scene.sys.isActive() || scene._runToken !== token;
}

/**
 * Inicia outra cena garantindo uma única transição por interação.
 * Evita o duplo `scene.start()` causado por toque duplo ou pelo evento de
 * mouse emulado que o navegador dispara após o toque.
 */
export function gotoScene(scene, key, data) {
  if (scene._navLock) return false;
  scene._navLock = true;
  scene.scene.start(key, data);
  return true;
}

/** Reinicia a cena atual com a mesma proteção de transição única. */
export function restartSceneOnce(scene, data) {
  if (scene._navLock) return false;
  scene._navLock = true;
  scene.scene.restart(data);
  return true;
}
