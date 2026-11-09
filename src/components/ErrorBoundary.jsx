import React from "react";

/** Catches render errors so a bug on one page shows a message instead of a blank screen. */
export default class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-black">Etwas ist schiefgelaufen</h1>
        <p className="text-muted-foreground max-w-sm">Die Seite konnte nicht angezeigt werden. Lade sie neu oder gehe zur Startseite.</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold text-sm">Neu laden</button>
          <button onClick={() => { window.location.href = "/"; }} className="px-6 py-2.5 bg-secondary rounded-full font-semibold text-sm">Startseite</button>
        </div>
      </div>
    );
  }
}
