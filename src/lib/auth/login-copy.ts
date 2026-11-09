const en = {
  register: "Create account", title: "Sign in to WINDX", intro: "Save your sites to your account and manage them on any device.",
  googleError: "Could not sign in with Google. If you already have a password account, sign in with your password and connect Google in Account.", google: "Continue with Google",
  email: "Email", password: "Password", hint: "At least 8 characters. Save your password in a password manager.",
  mail: "After signup, check your confirmation email. Status and resend are available in Account.", noMail: "Email delivery is not connected yet. You can create an account, but email confirmation is not available yet.",
  invitation: "Invitation code, if you received one", working: "Please wait…", signIn: "Sign in", existing: "Already have an account? Sign in", newAccount: "New here? Create account",
  rate: "Too many attempts. Try again in 15 minutes.", registerFailed: "Could not create account. Check your details and invitation code if required. An account may already exist.", invalid: "Incorrect email or password.", changed: "Sign-in details changed. Please sign in again.",
};
const ru: typeof en = {
  register: "Создать аккаунт", title: "Вход в WINDX", intro: "Сохраните доступ к своим сайтам и управляйте ими с любого устройства.",
  googleError: "Не удалось войти через Google. Если у вас уже есть парольный аккаунт, войдите с паролем и подключите Google в разделе «Аккаунт».", google: "Продолжить с Google",
  email: "Почта", password: "Пароль", hint: "Не менее 8 символов. Сохраните его в менеджере паролей.",
  mail: "После регистрации придёт письмо подтверждения. Статус и повторная отправка доступны в разделе «Аккаунт».", noMail: "Отправка писем пока не подключена. Аккаунт можно создать, но подтверждение почты пока недоступно.",
  invitation: "Код приглашения, если вы его получили", working: "Подождите…", signIn: "Войти", existing: "Уже есть аккаунт? Войти", newAccount: "Нет аккаунта? Создать",
  rate: "Слишком много попыток. Попробуйте через 15 минут.", registerFailed: "Не удалось создать аккаунт. Проверьте данные и код приглашения, если он нужен. Возможно, аккаунт уже существует.", invalid: "Неверная почта или пароль.", changed: "Данные входа изменились. Войдите ещё раз.",
};
const es: typeof en = {
  register: "Crear cuenta", title: "Iniciar sesión en WINDX", intro: "Guarda tus sitios en tu cuenta y gestiónalos desde cualquier dispositivo.",
  googleError: "No se pudo iniciar sesión con Google. Si ya tienes una cuenta con contraseña, inicia sesión con ella y conecta Google en Cuenta.", google: "Continuar con Google",
  email: "Correo", password: "Contraseña", hint: "Al menos 8 caracteres. Guarda la contraseña en tu gestor de contraseñas.",
  mail: "Tras registrarte, revisa el correo de confirmación. El estado y el reenvío están disponibles en Cuenta.", noMail: "El envío de correo aún no está conectado. Puedes crear una cuenta, pero todavía no se puede confirmar el correo.",
  invitation: "Código de invitación, si lo has recibido", working: "Espera…", signIn: "Iniciar sesión", existing: "¿Ya tienes cuenta? Inicia sesión", newAccount: "¿No tienes cuenta? Créala",
  rate: "Demasiados intentos. Inténtalo de nuevo en 15 minutos.", registerFailed: "No se pudo crear la cuenta. Revisa los datos y el código de invitación, si hace falta. Es posible que la cuenta ya exista.", invalid: "Correo o contraseña incorrectos.", changed: "Los datos de acceso cambiaron. Vuelve a iniciar sesión.",
};
export const loginCopy = (locale: string) => locale === "ru" ? ru : locale === "es" ? es : en;
