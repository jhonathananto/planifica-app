import { signInAction } from "@/app/auth/actions";
import { AuroraBackground } from "@/components/inspira/aurora-background";
import { RevealText } from "@/components/inspira/reveal-text";
import { ShimmerButton } from "@/components/inspira/shimmer-button";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <AuroraBackground>
    <main className="login-layout">
      <section className="login-intro">
        <p className="eyebrow">INSTITUTO SUPERIOR TECNOLÓGICO ISMAEL PÉREZ PAZMIÑO</p>
        <div className="login-mark" aria-hidden="true">PD</div>
        <h1><RevealText text="Planifica con claridad. Evita que te reporten los Coordinadores." /></h1>
        <p className="login-copy">
          Organiza tus sílabos, distribuye las actividades de las 16 semanas y
          prepara cada sesión desde un mismo espacio.
        </p>
      </section>

      <section className="login-card glass-card">
        <h2>Iniciar sesión</h2>
        <p>Ingresa con la cuenta que te asignó el administrador.</p>
        {error && (
          <div className="form-error" role="alert">
            {error === "cuenta"
              ? "La cuenta está inactiva o aún no tiene un perfil habilitado."
              : error === "invitacion"
                ? "No se pudo validar la invitación. Solicita al administrador que te envíe una nueva."
                : "No pudimos validar el correo y la contraseña."}
          </div>
        )}
        <form action={signInAction} className="login-form">
          <label htmlFor="email">Correo institucional</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="nombre@instipp.edu.ec" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required />
          <ShimmerButton type="submit">
            Iniciar sesión <span aria-hidden="true">↗</span>
          </ShimmerButton>
        </form>
        <p className="login-footnote">¿Necesitas acceso? Solicítalo al administrador de la aplicación.</p>
      </section>
      <footer className="login-footer">Planificación Docente</footer>
    </main>
    </AuroraBackground>
  );
}
