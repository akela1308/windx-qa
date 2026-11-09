const en = {
  deleteFirst:
    "Disconnect the domain in the site editor before deleting this site.",
  tab: "Domain",
  title: "Connect your own domain",
  intro:
    "Use an address you already own, such as www.example.co.uk. Buying a domain is separate. Your WINDX address stays available.",
  host: "Domain or subdomain",
  placeholder: "www.example.co.uk",
  add: "Continue",
  check: "Check connection",
  disconnect: "Disconnect domain",
  confirm:
    "Disconnect this domain? The WINDX address and site content will remain. DNS records are not removed from your account.",
  cancel: "Cancel",
  yes: "Disconnect",
  working: "Working…",
  platform:
    "Automatic connection is not enabled on WINDX yet. You can prepare ownership verification; routing records will appear after platform setup.",
  proof: "1. Confirm ownership",
  proofHelp:
    "In the DNS settings where you manage this domain, add this TXT record. Keep it while connected. This does not move your domain or change email.",
  route: "2. Route this address to WINDX",
  routeHelp:
    "Add the records below exactly as shown. Keep both ownership records. For an apex domain, your DNS provider must support CNAME flattening, ALIAS or ANAME. We do not provide a fixed IP address. Do not change nameservers or mail records.",
  exact:
    "Connect one exact address at a time. example.co.uk and www.example.co.uk are separate addresses. Start with www if your DNS provider cannot flatten an apex CNAME. For initial setup, use DNS-only, without a proxy.",
  waiting:
    "DNS changes and certificate issuance take time, sometimes up to 72 hours. Click Check connection after changes. This screen does not update automatically.",
  type: "Type",
  name: "Name",
  value: "Value",
  copy: "Copy",
  copied: "Copied",
  checked: "Last checked",
  offline:
    "The site is offline. Connecting a domain does not publish it. Publish from the publication menu when ready.",
  active: "Connection verified",
  open: "Open site",
  scope:
    "The search check currently checks your WINDX address. This connection does not redirect that address or change search metadata.",
  status: {
    ownership: "Waiting for ownership TXT",
    platform: "Preparing hosting",
    dns: "Waiting for DNS records",
    tls: "Waiting for HTTPS certificate",
    http: "Waiting for WINDX response",
    active: "Connected",
    removing: "Disconnected locally; hosting cleanup pending",
    disconnected: "Disconnected",
    error: "Connection needs attention",
  },
  issue: {
    none: "",
    ownership:
      "The ownership TXT was not found. Check the name and value, then wait for DNS updates.",
    dnsUnavailable: "DNS could not be checked. Try again later.",
    platform:
      "Hosting could not complete this step. Your site content has not changed. Try again or contact WINDX.",
    capacity:
      "The current hosting plan has no free domain slot. WINDX needs to arrange capacity; your plan has not been changed.",
    taken:
      "This domain is already connected. Contact WINDX if it belongs to you.",
    certificate:
      "Certificate issuance failed. Check the required records and your domain’s CAA settings with your DNS provider.",
    http: "HTTPS did not return the expected WINDX response. Check the routing records, certificate and proxy settings.",
    privateAddress:
      "This address points to a private or reserved network and cannot be connected.",
    stale: "The connection changed. Reload this page.",
    busy: "Please wait a minute and try again.",
    invalid:
      "Enter a domain name only, without https://, a path, port or wildcard. WINDX platform addresses cannot be connected here.",
    account: "Create an account or sign in to manage domains.",
    exists: "Disconnect the current domain before adding another.",
    notFound: "Site unavailable.",
  },
};
const ru: typeof en = {
  deleteFirst: "Сначала отключите домен в редакторе сайта, затем удалите сайт.",
  tab: "Домен",
  title: "Подключить свой домен",
  intro:
    "Используйте адрес, который уже принадлежит вам, например www.example.co.uk. Домен покупается отдельно. Адрес WINDX продолжит работать.",
  host: "Домен или поддомен",
  placeholder: "www.example.co.uk",
  add: "Продолжить",
  check: "Проверить подключение",
  disconnect: "Отключить домен",
  confirm:
    "Отключить этот домен? Адрес WINDX и содержимое сайта сохранятся. Записи DNS в вашем кабинете не удалятся.",
  cancel: "Отмена",
  yes: "Отключить",
  working: "Проверяем…",
  platform:
    "Автоматическое подключение на стороне WINDX ещё не включено. Можно подготовить подтверждение владения; записи для адреса появятся после настройки платформы.",
  proof: "1. Подтвердите владение",
  proofHelp:
    "В настройках DNS там, где вы управляете доменом, добавьте эту TXT-запись. Сохраните её на всё время подключения. Домен никуда не переносится, почта не меняется.",
  route: "2. Направьте этот адрес на WINDX",
  routeHelp:
    "Добавьте записи ниже точно как показано. Сохраните обе записи подтверждения. Для корневого домена провайдер DNS должен поддерживать CNAME flattening, ALIAS или ANAME. Постоянного IP у нас нет. Не меняйте серверы имён и записи почты.",
  exact:
    "Подключается один точный адрес. example.co.uk и www.example.co.uk считаются разными адресами. Если провайдер не поддерживает CNAME для корня, начните с www. Для первой настройки используйте DNS без прокси.",
  waiting:
    "Обновление DNS и выпуск сертификата требуют времени, иногда до 72 часов. После изменений нажмите «Проверить подключение». Экран не обновляется автоматически.",
  type: "Тип",
  name: "Имя",
  value: "Значение",
  copy: "Копировать",
  copied: "Скопировано",
  checked: "Последняя проверка",
  offline:
    "Сайт снят с публикации. Подключение домена само по себе его не публикует. Когда будете готовы, используйте меню публикации.",
  active: "Подключение проверено",
  open: "Открыть сайт",
  scope:
    "Проверка поиска пока проверяет адрес WINDX. Подключение не перенаправляет этот адрес и не меняет поисковые метаданные.",
  status: {
    ownership: "Ждём TXT подтверждения",
    platform: "Настраивается хостинг",
    dns: "Ждём записи DNS",
    tls: "Ждём HTTPS-сертификат",
    http: "Ждём ответ WINDX",
    active: "Подключён",
    removing: "Локально отключён; ожидается удаление с хостинга",
    disconnected: "Отключён",
    error: "Нужно проверить подключение",
  },
  issue: {
    none: "",
    ownership:
      "TXT подтверждения не найдена. Проверьте имя и значение, затем дождитесь обновления DNS.",
    dnsUnavailable: "Не удалось проверить DNS. Попробуйте позже.",
    platform:
      "Хостинг не смог завершить этот шаг. Содержимое сайта не изменилось. Повторите проверку или обратитесь в WINDX.",
    capacity:
      "На текущем тарифе хостинга нет свободного места для домена. WINDX нужно настроить доступную ёмкость; тариф не изменён.",
    taken: "Этот домен уже подключён. Если он ваш, обратитесь в WINDX.",
    certificate:
      "Не удалось выпустить сертификат. Проверьте нужные записи и настройки CAA у провайдера DNS.",
    http: "HTTPS не вернул ожидаемый ответ WINDX. Проверьте записи адреса, сертификат и настройки прокси.",
    privateAddress:
      "Адрес ведёт в частную или зарезервированную сеть, его нельзя подключить.",
    stale: "Подключение изменилось. Обновите страницу.",
    busy: "Подождите минуту и попробуйте снова.",
    invalid:
      "Введите только имя домена, без https://, пути, порта и звёздочки. Служебные адреса WINDX здесь подключать нельзя.",
    account: "Создайте аккаунт или войдите для управления доменами.",
    exists: "Сначала отключите текущий домен.",
    notFound: "Сайт недоступен.",
  },
};
const es: typeof en = {
  deleteFirst: "Desconecta el dominio en el editor antes de eliminar esta web.",
  tab: "Dominio",
  title: "Conecta tu propio dominio",
  intro:
    "Usa una dirección que ya sea tuya, como www.example.co.uk. El dominio se compra por separado. Tu dirección WINDX seguirá disponible.",
  host: "Dominio o subdominio",
  placeholder: "www.example.co.uk",
  add: "Continuar",
  check: "Comprobar conexión",
  disconnect: "Desconectar dominio",
  confirm:
    "¿Desconectar este dominio? Se conservan la dirección WINDX y el contenido. No se eliminan tus registros DNS.",
  cancel: "Cancelar",
  yes: "Desconectar",
  working: "Comprobando…",
  platform:
    "La conexión automática aún no está habilitada en WINDX. Puedes preparar la verificación; los registros de conexión aparecerán tras configurar la plataforma.",
  proof: "1. Confirma la propiedad",
  proofHelp:
    "Añade este registro TXT donde gestionas el DNS del dominio. Consérvalo mientras esté conectado. No se traslada el dominio ni se modifica el correo.",
  route: "2. Apunta esta dirección a WINDX",
  routeHelp:
    "Añade los registros tal como se muestran. Conserva ambas verificaciones. Para un dominio raíz, tu proveedor debe admitir CNAME flattening, ALIAS o ANAME. No ofrecemos IP fija. No cambies los servidores de nombres ni el correo.",
  exact:
    "Se conecta una dirección exacta. example.co.uk y www.example.co.uk son distintas. Empieza por www si tu proveedor no admite CNAME en la raíz. Usa DNS sin proxy para la configuración inicial.",
  waiting:
    "La propagación DNS y el certificado pueden tardar hasta 72 horas. Pulsa Comprobar conexión tras los cambios. La pantalla no se actualiza automáticamente.",
  type: "Tipo",
  name: "Nombre",
  value: "Valor",
  copy: "Copiar",
  copied: "Copiado",
  checked: "Última comprobación",
  offline:
    "La web está sin publicar. Conectar un dominio no la publica. Usa el menú de publicación cuando esté lista.",
  active: "Conexión verificada",
  open: "Abrir web",
  scope:
    "La comprobación de búsqueda aún usa la dirección WINDX. Esta conexión no la redirige ni modifica los metadatos de búsqueda.",
  status: {
    ownership: "Esperando TXT de propiedad",
    platform: "Preparando alojamiento",
    dns: "Esperando registros DNS",
    tls: "Esperando certificado HTTPS",
    http: "Esperando respuesta WINDX",
    active: "Conectado",
    removing: "Desconectado localmente; falta eliminarlo del alojamiento",
    disconnected: "Desconectado",
    error: "Revisa la conexión",
  },
  issue: {
    none: "",
    ownership:
      "No se encontró el TXT de propiedad. Revisa el nombre y el valor y espera la actualización DNS.",
    dnsUnavailable: "No se pudo comprobar DNS. Inténtalo más tarde.",
    platform:
      "El alojamiento no completó este paso. El contenido no ha cambiado. Reintenta o contacta con WINDX.",
    capacity:
      "El plan de alojamiento no tiene espacio para otro dominio. WINDX debe preparar capacidad; no se ha cambiado el plan.",
    taken: "Este dominio ya está conectado. Contacta con WINDX si es tuyo.",
    certificate:
      "Falló la emisión del certificado. Revisa los registros y CAA con tu proveedor DNS.",
    http: "HTTPS no devolvió la respuesta esperada de WINDX. Revisa DNS, certificado y proxy.",
    privateAddress:
      "La dirección apunta a una red privada o reservada y no se puede conectar.",
    stale: "La conexión cambió. Recarga la página.",
    busy: "Espera un minuto y vuelve a intentarlo.",
    invalid:
      "Escribe solo el dominio, sin https://, ruta, puerto ni comodines. No uses direcciones de la plataforma WINDX.",
    account: "Crea una cuenta o inicia sesión para gestionar dominios.",
    exists: "Desconecta el dominio actual antes de añadir otro.",
    notFound: "Web no disponible.",
  },
};
export const domainCopy = (locale: string) =>
  locale === "ru" ? ru : locale === "es" ? es : en;
