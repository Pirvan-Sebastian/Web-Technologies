export function validateEnrollment(input) {
  const values = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email.trim() : "",
    track: typeof input.track === "string" ? input.track : "",
    terms: input.terms === true,
  };
  const errors = {};

  if (!values.name) {
    errors.name = "Introdu numele";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Introdu o adresă de e-mail validă";
  }
  if (values.track !== "frontend" && values.track !== "backend") {
    errors.track = "Alege un parcurs de învățare";
  }
  if (!values.terms) {
    errors.terms = "Acceptă regulile laboratorului";
  }

  return { values, errors };
}

export function handleSubmission(input, ui) {
  const result = validateEnrollment(input);
  ui.setErrors(result.errors);

  if (Object.keys(result.errors).length > 0) {
    ui.focusSummary();
    return { ok: false, errors: result.errors };
  }

  ui.submit(result.values);
  return { ok: true, values: result.values };
}
