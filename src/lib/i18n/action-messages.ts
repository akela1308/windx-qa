const en = {
 trialBrowser: "Your trial site is already created or being created. Sign in or create an account to continue.", trialDay: "Today's trial generation limit has been reached. Sign in or try again tomorrow.", createFailed: "Could not create the site. Your description is kept in the field. Please try again.", editFailed: "That change did not go through. Nothing on the site was changed. Please try again.", unsupported: "This edit is not available in demo mode. Nothing on the site was changed.",
};
const ru: typeof en = {
 trialBrowser: "Ваш пробный сайт уже создан или создаётся. Для дальнейшей работы войдите или создайте аккаунт.", trialDay: "Лимит пробных генераций на сегодня исчерпан. Войдите в аккаунт или попробуйте завтра.", createFailed: "Не удалось создать сайт. Ваше описание сохранено в поле, попробуйте ещё раз.", editFailed: "Не удалось применить правку. Сайт не изменён. Попробуйте ещё раз.", unsupported: "В демо-режиме эта правка пока недоступна. Сайт не изменён.",
};
const es: typeof en = {
 trialBrowser: "Tu sitio de prueba ya está creado o se está creando. Inicia sesión o crea una cuenta para continuar.", trialDay: "Se alcanzó el límite de creaciones de prueba de hoy. Inicia sesión o inténtalo mañana.", createFailed: "No se pudo crear el sitio. Tu descripción se conserva en el campo. Inténtalo de nuevo.", editFailed: "No se pudo aplicar el cambio. El sitio no se ha modificado. Inténtalo de nuevo.", unsupported: "Este cambio no está disponible en modo de demostración. El sitio no se ha modificado.",
};
export const actionMessages = (locale: string) => locale === "ru" ? ru : locale === "es" ? es : en;
