export function draftCopy(locale: string) {
  return locale === "ru" ? {
    leave: "Правка кода ещё не применена. Покинуть раздел? Если локальная копия сохранена, её можно восстановить.",
    found: "Найден несохранённый код", intro: "Восстановите ввод или удалите локальную копию, чтобы начать заново. Код не запускается при восстановлении.",
    restore: "Восстановить ввод", discard: "Удалить локальный черновик", stale: "Версия сайта изменилась. Автоматическое восстановление недоступно: скопируйте нужный код ниже и перенесите его в актуальный раздел.",
    inspect: "Посмотреть сохранённый код", saved: "Ввод сохранён в этом браузере на 7 дней. Это не сохранённая версия сайта. При выходе из аккаунта локальная копия удаляется.",
    unavailable: "Браузер не сохранил локальную копию. Не закрывайте страницу до просмотра и применения правки.",
  } : locale === "es" ? {
    leave: "El cambio de código aún no se aplicó. ¿Salir de la sección? Puedes recuperar la copia local si se guardó.",
    found: "Se encontró código sin guardar", intro: "Recupera el texto o elimina la copia local para empezar de nuevo. Recuperarlo no ejecuta el código.",
    restore: "Recuperar texto", discard: "Eliminar borrador local", stale: "La versión del sitio cambió. No se puede recuperar automáticamente: copia el código de abajo a la sección actual.",
    inspect: "Ver código guardado", saved: "Texto guardado en este navegador durante 7 días. No es una versión guardada del sitio. La copia local se elimina al cerrar sesión.",
    unavailable: "El navegador no guardó la copia local. No cierres la página hasta revisar y aplicar el cambio.",
  } : {
    leave: "The code change has not been applied. Leave this section? You can restore the local copy if it was saved.",
    found: "Unsaved code found", intro: "Restore your input or delete the local copy to start again. Restoring does not run the code.",
    restore: "Restore input", discard: "Delete local draft", stale: "The site version changed. Automatic restore is unavailable: copy the code below into the current section.",
    inspect: "View saved code", saved: "Input saved in this browser for 7 days. This is not a saved site version. Signing out removes the local copy.",
    unavailable: "The browser could not save a local copy. Keep this page open until you preview and apply the change.",
  };
}
