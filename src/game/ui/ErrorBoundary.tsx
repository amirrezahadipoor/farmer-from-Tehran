"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearFatal, reportError } from "../errors";
import Recovery from "./Recovery";

/** مرزِ خطای کلِ بازی (مورد ۴): خطای رندر به‌جای صفحه‌ی سفید، صفحه‌ی بازیابی می‌آورد و ثبت می‌شود */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const at = (info.componentStack || "").trim().split("\n")[0]?.trim().slice(0, 48) || "";
    reportError(error, `react ${at}`.trim());
  }

  render() {
    if (this.state.error) {
      return (
        <Recovery
          error={this.state.error}
          onRetry={() => {
            clearFatal();
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}
