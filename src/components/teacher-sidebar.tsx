"use client";

import Link from "next/link";
import { useState } from "react";

export default function TeacherSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem("teacher-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem("teacher-sidebar-collapsed", current ? "0" : "1");
      } catch {
        /* noop */
      }
      return !current;
    });
  };

  return (
    <aside className={"sidebar teacher-sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="brand-row">
        <Link className="brand" href="/docente">
          <span className="brand-icon teacher-brand">P</span>
          <span><strong>Planificación</strong><small>DOCENTE</small></span>
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggle}
          title={collapsed ? "Expandir menú" : "Minimizar menú"}
          aria-label={collapsed ? "Expandir menú" : "Minimizar menú"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <div className="side-group">
        <span className="side-heading">MI ESPACIO</span>
        <Link className="side-link active" href="/docente" title="Mis asignaturas"><span>⌂</span> Mis asignaturas</Link>
        <span className="side-heading side-heading-gap">DOCUMENTOS</span>
        <span className="side-link side-link-muted" title="Sílabos"><span>▤</span> Sílabos</span>
        <span className="side-link side-link-muted" title="Planes de clase"><span>▧</span> Planes de clase</span>
      </div>
      <div className="sidebar-bottom">
        <span className="teacher-chip">ESPACIO DOCENTE</span>
        <span className="side-caption">Tu carga académica y tus documentos en un solo lugar.</span>
      </div>
    </aside>
  );
}
