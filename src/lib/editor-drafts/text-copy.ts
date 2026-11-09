export function textDraftCopy(locale: string) {
  return locale === "ru" ? {
    found: "Найден несохранённый текст", intro: "Восстановите ввод в этот раздел или удалите локальную копию. Сайт изменится только после просмотра и применения правки.",
    restore: "Восстановить текст", discard: "Удалить локальный черновик", inspect: "Посмотреть сохранённый текст",
    stale: "Версия или поля раздела изменились. Автоматическое восстановление недоступно. Скопируйте нужный текст ниже, удалите локальную копию и вставьте текст в актуальный раздел.",
    saved: "Текст сохранён в этом браузере на 7 дней. Это не версия сайта. При выходе из аккаунта локальные копии удаляются. Изображения и подтверждения фактов не восстанавливаются.",
    unavailable: "Браузер не сохранил локальную копию текста. Не закрывайте страницу до просмотра и применения правки.",
    leave: "Правка ещё не применена. Покинуть раздел? Сохранённый локально текст можно восстановить. Изменения изображений и отметки фактов будут потеряны.",
    section: "Раздел", meta: "Название и описание страницы",
  } : locale === "es" ? {
    found: "Se encontró texto sin guardar", intro: "Recupera el texto en esta sección o elimina la copia local. El sitio solo cambiará después de revisar y aplicar el cambio.",
    restore: "Recuperar texto", discard: "Eliminar borrador local", inspect: "Ver texto guardado",
    stale: "La versión o los campos cambiaron. No se puede recuperar automáticamente. Copia el texto de abajo, elimina la copia local y pega el texto en la sección actual.",
    saved: "Texto guardado en este navegador durante 7 días. No es una versión del sitio. Las copias locales se eliminan al cerrar sesión. Las imágenes y las confirmaciones de datos no se recuperan.",
    unavailable: "El navegador no guardó la copia local del texto. No cierres la página hasta revisar y aplicar el cambio.",
    leave: "El cambio aún no se aplicó. ¿Salir? Puedes recuperar el texto guardado localmente. Los cambios de imágenes y las confirmaciones se perderán.",
    section: "Sección", meta: "Título y descripción de la página",
  } : {
    found: "Unsaved text found", intro: "Restore input to this section or delete the local copy. The site only changes after you review and apply the edit.",
    restore: "Restore text", discard: "Delete local draft", inspect: "View saved text",
    stale: "The version or section fields changed. Automatic restore is unavailable. Copy the text below, delete the local copy, then paste into the current section.",
    saved: "Text saved in this browser for 7 days. This is not a site version. Signing out removes local copies. Images and fact confirmations are not restored.",
    unavailable: "The browser could not save a local text copy. Keep this page open until you review and apply the change.",
    leave: "The edit has not been applied. Leave this section? Locally saved text can be restored. Image changes and fact confirmations will be lost.",
    section: "Section", meta: "Page title and description",
  };
}
