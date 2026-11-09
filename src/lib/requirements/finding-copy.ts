import type { RequirementsCode } from "./types";
type FindingText = [string, string, string];
const en: Record<RequirementsCode, FindingText> = {
  businessDetails: [
    "Review applicable provider information",
    "This check does not establish which information-society-service or sector provisions apply.",
    "Review the real business identity, geographical address, effective contact details and any applicable VAT, register or regulator disclosures.",
  ],
  market: [
    "Confirm the relevant market",
    "The UK review cannot determine jurisdiction from a business name or language.",
    "Confirm whether this business operates in, or targets, the UK. Other markets need their own review.",
  ],
  outsideUk: [
    "A different jurisdiction needs review",
    "The owner selected a market outside the UK. This rule set does not assess it.",
    "Keep the factual data map and ask a suitably qualified adviser about the applicable market.",
  ],
  entity: [
    "Confirm the legal form",
    "A sole trader and a registered company have different disclosure duties.",
    "Choose the real legal form. Do not infer it from a trading name.",
  ],
  identity: [
    "Complete the business identity",
    "Some business details have not been supplied by the owner.",
    "Enter the real legal name and, where applicable, registration details. Nothing is published by this answer.",
  ],
  placement: [
    "Check where the supplied details appear",
    "The supplied values were not all matched in the structured page text. This is a clue, not proof that they are absent from the public site.",
    "Review the contact/footer or linked disclosures and prepare a narrow change using the confirmed details.",
  ],
  privacyMissing: [
    "No privacy notice candidate found in the document",
    "No recognised heading or privacy link was found outside custom code. This does not prove no notice exists elsewhere.",
    "Confirm the data map and make an accurate notice easy to find, including at the collection point. Preview any addition first.",
  ],
  privacyReview: [
    "Review the privacy notice and its accessibility",
    "A candidate section or link was found. Its wording, destination and visibility have not been validated.",
    "Open it yourself and compare the notice with actual purposes, recipients, retention, rights and applicable transfers.",
  ],
  privacyFacts: [
    "Clarify how personal data is used",
    "The owner has not answered some processing questions. A generic notice cannot settle these decisions.",
    "Answer what is known, leave unknowns explicit and obtain advice for unresolved lawful-basis or transfer questions.",
  ],
  recipient: [
    "Confirm who receives enquiries",
    "The platform recipient has not been confirmed. A business name does not confirm the responsible person.",
    "Review the recipient in Facts. Enquiries are saved in the private inbox; optional owner notifications contain no visitor details.",
  ],
  retention: [
    "Check how the retention period will be met",
    "The inbox currently keeps enquiries until manual deletion. There is no automatic retention schedule.",
    "Agree an actual deletion process and review backups before promising a retention period in the notice.",
  ],
  trackingInventory: [
    "Identify storage and tracking technologies",
    "No owner inventory is available. This check does not run a cookie or network audit.",
    "List each technology and purpose, including widgets, then decide which rules and exceptions apply.",
  ],
  advertising: [
    "Review consent before advertising tracking",
    "The owner reports advertising technology. Presence or appearance of a banner does not demonstrate effective consent.",
    "Have the relevant mechanism checked before use: prior control, genuine choice, withdrawal and evidence of the choice.",
  ],
  statistics: [
    "Review the statistical-purpose exception",
    "An analytics label alone does not establish an exception. Purpose and configuration matter.",
    "Check the current ICO conditions, required information and a simple means of objecting; otherwise review consent.",
  ],
  trackingReview: [
    "Review the declared technology and purpose",
    "The owner’s description has not been tested against actual device storage or access.",
    "Verify the exact purpose, exception or consent mechanism. Do not add a blanket banner by default.",
  ],
  customCode: [
    "Custom code needs a separate review",
    "An isolated code block exists. Its scripts, forms, cookies and external vendors have not been executed or audited.",
    "Inspect the real widget configuration and data recipients with a specialist. Record the services you actually use.",
  ],
  fonts: [
    "Include external fonts in the data map",
    "The page renderer configures Google Fonts requests. This does not itself prove that cookies are set.",
    "Review the external request, privacy information, processor roles and any transfer arrangements. Do not infer a consent requirement from the hostname.",
  ],
  salesScope: [
    "Confirm whether contracts are made online",
    "A booking or contact button alone does not prove the site sells to consumers.",
    "Confirm whether visitors can place binding orders or bookings and whether buyers are consumers or businesses.",
  ],
  consumerSales: [
    "Review the consumer ordering path",
    "The owner reports consumer orders. This checker has not tested checkout or the contract information.",
    "Review pre-contract information, total costs, payment obligation, confirmation and applicable cancellation rules and exceptions.",
  ],
  businessSales: [
    "Review the business-to-business contract path",
    "The owner reports business orders. Consumer rules should not simply be copied across.",
    "Review the actual terms, disclosures and ordering process for this business model.",
  ],
  specialScope: [
    "Confirm any special context",
    "The checker cannot infer a regulated activity, sensitive-data use or children’s audience from page wording.",
    "Confirm any regulated activity, children’s data, sensitive data or public-sector service so the review can be scoped.",
  ],
  specialist: [
    "Arrange a review of the special context",
    "The owner identified a context this basic rule set cannot assess fully.",
    "Use an adviser for the relevant sector and applicable privacy, accessibility or children’s rules. Do not treat this report as approval.",
  ],
  facts: [
    "Review unconfirmed business facts",
    "Some facts in this version remain unconfirmed or marked wrong.",
    "Confirm or correct them in Facts before relying on them in business or privacy information.",
  ],
  accessibility: [
    "Arrange an accessibility review",
    "The technical checks do not establish accessibility or legal compliance. Public-sector rules differ from duties of other service providers.",
    "Check real user paths with keyboard and assistive technology, and review reasonable adjustments and any applicable public-sector duties.",
  ],
};
const ru: Record<RequirementsCode, FindingText> = {
  businessDetails: [
    "Проверьте применимые сведения о поставщике",
    "Проверка не устанавливает применимость всех правил электронных услуг и отрасли.",
    "Сверьте настоящие сведения о бизнесе, географический адрес, доступные контакты и, если применимо, раскрытие НДС, регистрации и регулятора.",
  ],
  market: [
    "Уточните применимый рынок",
    "Британскую юрисдикцию нельзя определить по названию бизнеса или языку сайта.",
    "Подтвердите, работает ли бизнес в Британии или с британской аудиторией. Другие рынки требуют отдельной проверки.",
  ],
  outsideUk: [
    "Нужна проверка другой юрисдикции",
    "Владелец выбрал рынок вне Британии. Этот набор правил его не оценивает.",
    "Используйте фактическую карту данных и обратитесь к специалисту по нужному рынку.",
  ],
  entity: [
    "Уточните форму бизнеса",
    "У индивидуального предпринимателя и зарегистрированной компании разные требования к раскрытию сведений.",
    "Укажите настоящую форму бизнеса. Торговое название её не подтверждает.",
  ],
  identity: [
    "Дополните сведения о бизнесе",
    "Часть сведений ещё не предоставлена владельцем.",
    "Укажите настоящее юридическое имя и, когда применимо, регистрационные данные. Ответ ничего не публикует.",
  ],
  placement: [
    "Проверьте размещение указанных сведений",
    "Не все указанные значения найдены в тексте структурированного документа. Это подсказка, а не доказательство отсутствия на публичном сайте.",
    "Проверьте контакты, подвал или отдельное раскрытие сведений. Подготовьте узкую правку с настоящими данными.",
  ],
  privacyMissing: [
    "В документе не найдено уведомление о данных",
    "Вне своего кода не найден распознанный заголовок или ссылка privacy. Это не доказывает, что уведомления нет где-либо ещё.",
    "Сверьте карту данных и сделайте точное уведомление доступным, в том числе рядом с местом сбора данных. Сначала просмотрите добавление.",
  ],
  privacyReview: [
    "Проверьте содержание и доступность уведомления",
    "Найден возможный раздел или ссылка. Содержание, адрес назначения и видимость не проверены.",
    "Откройте уведомление сами и сверьте реальные цели, получателей, сроки, права людей и применимые передачи данных.",
  ],
  privacyFacts: [
    "Уточните работу с персональными данными",
    "Владелец ещё не ответил на часть вопросов об обработке. Общий шаблон документа не решает эти вопросы.",
    "Ответьте на то, что известно. Неизвестное оставьте явно отмеченным; спорные основания обработки и передачи обсудите со специалистом.",
  ],
  recipient: [
    "Подтвердите получателя заявок",
    "Получатель в настройках платформы не подтверждён. Название бизнеса не подтверждает ответственное лицо.",
    "Проверьте получателя во вкладке фактов. Заявки сохраняются в закрытом ящике, короткие уведомления можно включить на подтверждённую почту владельца, без данных посетителя.",
  ],
  retention: [
    "Проверьте выполнение срока хранения",
    "Сейчас заявки хранятся до ручного удаления. Автоматического удаления по сроку нет.",
    "Определите реальный процесс удаления и проверьте резервные копии до обещания срока в уведомлении.",
  ],
  trackingInventory: [
    "Определите технологии хранения и отслеживания",
    "Перечень от владельца неизвестен. Проверка не выполняет аудит cookies или сетевых запросов.",
    "Перечислите технологии и их цели, включая виджеты. Затем определите применимые правила и исключения.",
  ],
  advertising: [
    "Проверьте согласие до рекламного отслеживания",
    "Владелец указал рекламные технологии. Наличие или внешний вид баннера не доказывает работу согласия.",
    "Проверьте механизм до использования: предварительное управление, настоящий выбор, отзыв и подтверждение выбора.",
  ],
  statistics: [
    "Проверьте исключение для статистических целей",
    "Само название «аналитика» не подтверждает исключение. Важны цель и настройки.",
    "Сверьте актуальные условия ICO, информирование и простой способ возражения; иначе проверьте необходимость согласия.",
  ],
  trackingReview: [
    "Проверьте указанную технологию и цель",
    "Ответ владельца не сопоставлялся с реальным хранением или доступом к данным устройства.",
    "Проверьте точную цель, исключение или механизм согласия. Не добавляйте общий баннер автоматически.",
  ],
  customCode: [
    "Свой код требует отдельной проверки",
    "В документе есть изолированный блок кода. Его скрипты, формы, cookies и внешние сервисы не запускались и не проверялись.",
    "Проверьте реальные настройки виджета и получателей данных со специалистом. Запишите фактически используемые сервисы.",
  ],
  fonts: [
    "Учтите внешние шрифты в карте данных",
    "Рендер страницы настраивает запросы Google Fonts. Это само по себе не доказывает установку cookies.",
    "Проверьте внешний запрос, информацию для посетителя, роли сторон и условия передачи. Не выводите необходимость согласия только из имени сервера.",
  ],
  salesScope: [
    "Уточните, заключаются ли договоры онлайн",
    "Кнопка записи или контакта сама по себе не доказывает продажу потребителю.",
    "Уточните, можно ли оформить обязательный заказ или запись и кто покупатель: потребитель или бизнес.",
  ],
  consumerSales: [
    "Проверьте путь заказа для потребителя",
    "Владелец указал заказы потребителей. Проверка не тестировала оформление и договорную информацию.",
    "Проверьте сведения до договора, полную стоимость, обязательство оплаты, подтверждение и применимые правила отмены с исключениями.",
  ],
  businessSales: [
    "Проверьте договорный путь для бизнеса",
    "Владелец указал заказы от бизнеса. Правила для потребителей нельзя переносить автоматически.",
    "Проверьте реальные условия, раскрытие сведений и оформление заказа для этой модели.",
  ],
  specialScope: [
    "Уточните особые обстоятельства",
    "По тексту нельзя достоверно определить регулируемую деятельность, чувствительные данные или детскую аудиторию.",
    "Подтвердите наличие регулируемой деятельности, данных детей, чувствительных данных или услуги публичного сектора.",
  ],
  specialist: [
    "Нужна проверка особых обстоятельств",
    "Владелец указал случай, который этот базовый набор правил полностью не оценивает.",
    "Обратитесь к специалисту по отрасли и применимым правилам данных, доступности или защиты детей. Отчёт не является одобрением.",
  ],
  facts: [
    "Проверьте неподтверждённые сведения",
    "В этой версии есть неподтверждённые или помеченные как неверные факты.",
    "Подтвердите или исправьте их во вкладке фактов до использования в сведениях о бизнесе и данных.",
  ],
  accessibility: [
    "Проведите проверку доступности",
    "Технические проверки не подтверждают доступность или законность. Правила публичного сектора отличаются от обязанностей остальных поставщиков услуг.",
    "Проверьте реальные пути клавиатурой и вспомогательными технологиями, разумные приспособления и применимые обязанности публичного сектора.",
  ],
};
const es: Record<RequirementsCode, FindingText> = {
  businessDetails: [
    "Revisa la información del proveedor aplicable",
    "Esta revisión no determina todas las reglas de servicios online o del sector aplicables.",
    "Revisa identidad, dirección geográfica, contacto efectivo y datos de IVA, registro o regulador cuando correspondan.",
  ],
  market: [
    "Confirma el mercado aplicable",
    "El nombre o idioma no determina la jurisdicción británica.",
    "Confirma si el negocio opera en Reino Unido o se dirige a su público. Otros mercados necesitan otra revisión.",
  ],
  outsideUk: [
    "Revisa la otra jurisdicción",
    "El propietario eligió un mercado fuera de Reino Unido. Estas reglas no lo evalúan.",
    "Usa el mapa de datos y consulta a un profesional del mercado correspondiente.",
  ],
  entity: [
    "Confirma la forma jurídica",
    "Una persona autónoma y una sociedad tienen obligaciones de identificación distintas.",
    "Indica la forma jurídica real. No la deduzcas del nombre comercial.",
  ],
  identity: [
    "Completa la identidad del negocio",
    "Faltan datos proporcionados por el propietario.",
    "Indica el nombre legal y los datos registrales aplicables. La respuesta no publica nada.",
  ],
  placement: [
    "Revisa dónde aparecen los datos",
    "No todos los valores se encontraron en el texto estructurado. Esto no demuestra su ausencia en la web pública.",
    "Revisa contacto, pie o información enlazada y prepara un cambio limitado con los datos reales.",
  ],
  privacyMissing: [
    "No se encontró un posible aviso de privacidad",
    "No se reconoció un título o enlace fuera del código propio. El aviso podría existir en otro lugar.",
    "Confirma el mapa de datos y facilita un aviso preciso, también donde se recogen datos. Revisa cualquier incorporación antes de aplicarla.",
  ],
  privacyReview: [
    "Revisa el aviso y su acceso",
    "Se encontró una posible sección o enlace. Su contenido, destino y visibilidad no se validaron.",
    "Ábrelo y contrástalo con fines, destinatarios, plazos, derechos y transferencias aplicables.",
  ],
  privacyFacts: [
    "Aclara el uso de datos personales",
    "Faltan respuestas sobre el tratamiento. Una plantilla genérica no toma estas decisiones.",
    "Responde lo conocido y deja explícitas las dudas. Consulta sobre bases jurídicas o transferencias pendientes.",
  ],
  recipient: [
    "Confirma quién recibe consultas",
    "No se confirmó el destinatario de la plataforma.",
    "Revísalo en Datos. Las consultas se guardan en la bandeja privada; los avisos opcionales al correo confirmado del propietario no incluyen datos del visitante.",
  ],
  retention: [
    "Revisa cómo cumplirás el plazo",
    "Las consultas se conservan hasta su eliminación manual. No hay borrado automático por plazo.",
    "Define un proceso real de eliminación y revisa las copias antes de prometer un plazo.",
  ],
  trackingInventory: [
    "Identifica almacenamiento y seguimiento",
    "No hay inventario del propietario. No se ha ejecutado una auditoría de cookies o red.",
    "Enumera tecnologías y fines, incluidos widgets, y determina reglas y excepciones aplicables.",
  ],
  advertising: [
    "Revisa el consentimiento para publicidad",
    "El propietario declaró tecnología publicitaria. Un banner visible no demuestra consentimiento efectivo.",
    "Revisa control previo, elección real, retirada y prueba de la elección antes de usarla.",
  ],
  statistics: [
    "Revisa la excepción estadística",
    "La etiqueta de analítica no establece una excepción. Importan fines y ajustes.",
    "Comprueba las condiciones ICO, información y un medio sencillo de oposición; si no, revisa el consentimiento.",
  ],
  trackingReview: [
    "Revisa la tecnología declarada",
    "La respuesta no se contrastó con el almacenamiento o acceso real al dispositivo.",
    "Verifica fin, excepción o consentimiento. No añadas un banner universal automáticamente.",
  ],
  customCode: [
    "El código propio requiere revisión",
    "Existe un bloque aislado. Sus scripts, formularios, cookies y servicios externos no se ejecutaron ni auditaron.",
    "Revisa con un especialista la configuración real y los destinatarios. Registra los servicios utilizados.",
  ],
  fonts: [
    "Incluye las fuentes externas en el mapa",
    "El render configura solicitudes a Google Fonts. Esto no demuestra que se instalen cookies.",
    "Revisa la solicitud, la información al visitante, los roles y las transferencias. El dominio no determina por sí solo la necesidad de consentimiento.",
  ],
  salesScope: [
    "Confirma si se contrata online",
    "Un botón de reserva o contacto no demuestra una venta a consumidores.",
    "Confirma si permite pedidos o reservas vinculantes y si los compradores son consumidores o empresas.",
  ],
  consumerSales: [
    "Revisa el proceso para consumidores",
    "El propietario declaró pedidos de consumidores. No se probaron compra ni información contractual.",
    "Revisa información previa, costes totales, obligación de pago, confirmación y cancelación con sus excepciones.",
  ],
  businessSales: [
    "Revisa el proceso entre empresas",
    "El propietario declaró pedidos de empresas. No se deben copiar reglas de consumidores sin revisar.",
    "Comprueba las condiciones, la información y el proceso real de pedido.",
  ],
  specialScope: [
    "Confirma las circunstancias especiales",
    "El texto no permite determinar actividad regulada, datos sensibles o público infantil.",
    "Confirma actividad regulada, datos de menores, datos sensibles o servicios del sector público.",
  ],
  specialist: [
    "Solicita una revisión especializada",
    "El propietario identificó un contexto que estas reglas básicas no evalúan por completo.",
    "Consulta al especialista del sector y las reglas aplicables. El informe no es una aprobación.",
  ],
  facts: [
    "Revisa los datos sin confirmar",
    "Hay datos sin confirmar o marcados como incorrectos en esta versión.",
    "Confírmalos o corrígelos antes de utilizarlos en información del negocio o privacidad.",
  ],
  accessibility: [
    "Organiza una revisión de accesibilidad",
    "Las comprobaciones técnicas no certifican accesibilidad ni legalidad. Las reglas públicas y las de otros proveedores difieren.",
    "Prueba recorridos con teclado y ayudas técnicas; revisa ajustes razonables y las obligaciones públicas aplicables.",
  ],
};
export const requirementsFindingCopy = (
  locale: string,
  code: RequirementsCode,
) => (locale === "ru" ? ru : locale === "es" ? es : en)[code];
