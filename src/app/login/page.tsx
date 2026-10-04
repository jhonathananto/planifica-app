import { signInAction } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <main className="login-layout">
      <section className="login-intro">
        <p className="eyebrow">INSTITUTO · PLANIFICACIÓN ACADÉMICA</p>
        <div className="login-mark" aria-hidden="true">PD</div>
        <h1>Planifica con claridad. Llega listo a clase.</h1>
        <p className="login-copy">
          Organiza tus sílabos, distribuye las actividades de las 16 semanas y
          prepara cada sesión desde un mismo espacio.
        </p>
        <div className="login-proof">
          <span>01 / Oferta académica</span>
          <span>02 / Sílabo y Anexo 1</span>
          <span>03 / Plan de clase</span>
        </div>
      </section>

      <section className="login-card">
        <div className="login-card-top">
          <span className="tiny-label">ACCESO INSTITUCIONAL</span>
          <span className="secure-label"><i /> Conexión protegida</span>
        </div>
        <h2>Iniciar sesión</h2>
        <p>Ingresa con la cuenta que te asignó el administrador.</p>
        {error && (
          <div className="form-error" role="alert">
            {error === "cuenta"
              ? "La cuenta está inactiva o aún no tiene un perfil habilitado."
              : "No pudimos validar el correo y la contraseña."}
          </div>
        )}
        <form action={signInAction} className="login-form">
          <label htmlFor="email">Correo institucional</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="nombre@institucion.edu" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required />
          <button className="button button-primary button-full" type="submit">
            Entrar al espacio <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="login-footnote">¿Necesitas acceso? Solicítalo al administrador de la aplicación.</p>
      </section>
      <footer className="login-footer">Planificación Docente <span>·</span> Períodos de 16 semanas</footer>
    </main>
  );
}

