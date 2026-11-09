import { geographyCopy } from "./geography";
import type { RequirementsQuestion } from "./questions";

type Questions = Record<Exclude<RequirementsQuestion, "country" | "customerCountries">, [string, string, string]>;
const qEn: Questions = {
  market: [
    "Does this business operate in, or target, the UK?",
    "This review covers UK guidance, not every market.",
    "",
  ],
  entity: [
    "What is the legal form of the business?",
    "A trading name does not identify the legal entity.",
    "",
  ],
  legalName: [
    "What is the real legal name?",
    "Confirm the person or entity responsible. This answer does not publish it.",
    "",
  ],
  number: [
    "What is its registration number?",
    "For the actual company or LLP, not an invented sample.",
    "",
  ],
  office: [
    "What is its registered office address?",
    "This is not necessarily the shop address. Confirm the real registered office.",
    "",
  ],
  registeredIn: [
    "Where is it registered?",
    "For example England and Wales, Scotland or Northern Ireland, if applicable.",
    "",
  ],
  sales: [
    "Can visitors make binding orders or bookings online?",
    "Include external booking or payment services linked from this site. Choose the buyer type.",
    "",
  ],
  tracking: [
    "What storage or tracking technology is used?",
    "Include cookies, local storage, analytics, advertising and embedded services. No automatic audit was performed.",
    "",
  ],
  extraData: [
    "Is personal data collected beyond the WINDX enquiry form?",
    "For example a newsletter, external booking, account or payment service. The known enquiry form is already included.",
    "",
  ],
  special: [
    "Is there a special context?",
    "Regulated activities, sensitive or children's data and public-sector services can need a separate review.",
    "",
  ],
  vendors: [
    "Which additional services and purposes are involved?",
    "Name the actual widgets, analytics or advertising services. Leave unknown if you have not checked.",
    "",
  ],
  purpose: [
    "What are the actual purposes for using enquiry or other data?",
    "Describe what the business really does, including any reuse.",
    "",
  ],
  basis: [
    "What lawful basis has the business decided to use?",
    "Do not guess or choose consent automatically. Leave blank for advice if undecided.",
    "",
  ],
  retention: [
    "What retention period and deletion process will you use?",
    "The inbox only supports manual deletion. Include how you will fulfil the period, not just a promise.",
    "",
  ],
  privacyContact: [
    "Who handles privacy requests and how can people contact them?",
    "Provide the real responsible contact, not a sample.",
    "",
  ],
  sharing: [
    "Who can access the data and with whom is it shared?",
    "Include the business, WINDX hosting and any actual external recipients. When enabled, WINDX sends a minimal email notification through Resend, without visitor details.",
    "",
  ],
  transfers: [
    "What hosting locations and international transfers have been verified?",
    "Include the actual arrangements and safeguards if applicable. An unknown answer must stay unknown.",
    "",
  ],
};
const qRu: Questions = {
  market: [
    "Бизнес работает в Британии или с её аудиторией?",
    "Проверка опирается на британские руководства, а не на все рынки.",
    "",
  ],
  entity: [
    "Какова настоящая форма бизнеса?",
    "Торговое название не определяет юридическое лицо.",
    "",
  ],
  legalName: [
    "Какое настоящее юридическое имя или название?",
    "Подтвердите ответственное лицо или организацию. Ответ ничего не публикует.",
    "",
  ],
  number: [
    "Какой регистрационный номер?",
    "Укажите номер настоящей компании или LLP, а не пример.",
    "",
  ],
  office: [
    "Какой адрес зарегистрированного офиса?",
    "Он может отличаться от адреса магазина. Укажите настоящий registered office.",
    "",
  ],
  registeredIn: [
    "Где зарегистрирована организация?",
    "Например England and Wales, Scotland или Northern Ireland, если применимо.",
    "",
  ],
  sales: [
    "Можно ли оформить обязательный заказ или запись онлайн?",
    "Учитывайте внешнюю запись или оплату по ссылкам с сайта. Выберите тип покупателя.",
    "",
  ],
  tracking: [
    "Какие технологии хранения или отслеживания используются?",
    "Учитывайте cookies, local storage, аналитику, рекламу и виджеты. Автоматического аудита не было.",
    "",
  ],
  extraData: [
    "Собираются ли данные помимо формы заявки WINDX?",
    "Например подписка, внешняя запись, аккаунт или оплата. Известная форма уже учтена.",
    "",
  ],
  special: [
    "Есть ли особые обстоятельства?",
    "Регулируемая деятельность, чувствительные данные, дети и публичный сектор могут требовать отдельного разбора.",
    "",
  ],
  vendors: [
    "Какие дополнительные сервисы и цели задействованы?",
    "Назовите реальные виджеты, аналитику или рекламу. Если не проверяли, оставьте неизвестным.",
    "",
  ],
  purpose: [
    "Для каких реальных целей используются заявки и другие данные?",
    "Опишите настоящую работу бизнеса, включая повторное использование данных.",
    "",
  ],
  basis: [
    "Какое правовое основание обработки выбрал бизнес?",
    "Не угадывайте и не выбирайте согласие автоматически. Если не решили, оставьте пустым для консультации.",
    "",
  ],
  retention: [
    "Какой срок и процесс удаления вы будете соблюдать?",
    "В ящике только ручное удаление. Укажите процесс выполнения срока, а не просто обещание.",
    "",
  ],
  privacyContact: [
    "Кто отвечает на обращения о данных и как с ним связаться?",
    "Укажите настоящий ответственный контакт, а не пример.",
    "",
  ],
  sharing: [
    "Кто получает доступ к данным и кому они передаются?",
    "Учитывайте бизнес, хостинг WINDX и реальные внешние стороны. При включении WINDX отправляет через Resend короткое уведомление без данных посетителя.",
    "",
  ],
  transfers: [
    "Какие места хранения и международные передачи проверены?",
    "Укажите реальные условия и меры, если применимо. Неизвестное должно остаться неизвестным.",
    "",
  ],
};
const qEs: Questions = {
  market: [
    "¿El negocio opera en Reino Unido o se dirige a su público?",
    "Esta revisión usa guías británicas, no de todos los mercados.",
    "",
  ],
  entity: [
    "¿Cuál es la forma jurídica real?",
    "El nombre comercial no determina la entidad legal.",
    "",
  ],
  legalName: [
    "¿Cuál es el nombre legal real?",
    "Confirma la persona o entidad responsable. No se publica la respuesta.",
    "",
  ],
  number: [
    "¿Cuál es el número de registro?",
    "De la sociedad o LLP real, no un ejemplo.",
    "",
  ],
  office: [
    "¿Cuál es el domicilio social?",
    "Puede diferir de la dirección comercial. Confirma el real.",
    "",
  ],
  registeredIn: [
    "¿Dónde está registrada?",
    "Por ejemplo England and Wales, Scotland o Northern Ireland, si corresponde.",
    "",
  ],
  sales: [
    "¿Se pueden hacer pedidos o reservas vinculantes online?",
    "Incluye reservas o pagos externos enlazados. Elige el tipo de comprador.",
    "",
  ],
  tracking: [
    "¿Qué tecnologías de almacenamiento o seguimiento usas?",
    "Incluye cookies, almacenamiento local, analítica, publicidad y widgets. No hubo auditoría automática.",
    "",
  ],
  extraData: [
    "¿Recoges datos fuera del formulario WINDX?",
    "Por ejemplo suscripción, reserva externa, cuenta o pago. El formulario conocido ya se incluye.",
    "",
  ],
  special: [
    "¿Hay circunstancias especiales?",
    "Actividad regulada, datos sensibles o de menores y sector público pueden requerir revisión aparte.",
    "",
  ],
  vendors: [
    "¿Qué servicios adicionales y fines intervienen?",
    "Indica widgets, analítica o publicidad reales. Déjalo desconocido si no lo verificaste.",
    "",
  ],
  purpose: [
    "¿Cuáles son los fines reales del uso de datos?",
    "Describe la actividad real, incluida cualquier reutilización.",
    "",
  ],
  basis: [
    "¿Qué base jurídica decidió usar el negocio?",
    "No adivines ni elijas consentimiento por defecto. Déjalo vacío si necesitas asesoría.",
    "",
  ],
  retention: [
    "¿Qué plazo y proceso de eliminación cumplirás?",
    "La bandeja solo ofrece borrado manual. Describe el proceso, no solo una promesa.",
    "",
  ],
  privacyContact: [
    "¿Quién atiende solicitudes de privacidad y cómo?",
    "Indica un contacto responsable real.",
    "",
  ],
  sharing: [
    "¿Quién accede a los datos y a quién se comunican?",
    "Incluye negocio, alojamiento WINDX y terceros reales. No hay avisos por email.",
    "",
  ],
  transfers: [
    "¿Qué ubicaciones y transferencias internacionales se verificaron?",
    "Indica condiciones y garantías reales si corresponden. Lo desconocido debe quedar explícito.",
    "",
  ],
};
export const requirementsQuestionCopy = (
  locale: string,
  key: RequirementsQuestion,
): [string,string,string] => {
  const c = geographyCopy(locale);
  if (key === "country") return [c.country,c.countryWhy,""];
  if (key === "customerCountries") return [c.customers,c.customersWhy,""];
  return (locale === "ru" ? qRu : locale === "es" ? qEs : qEn)[key];
};
