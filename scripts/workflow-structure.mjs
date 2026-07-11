export function parseWorkflow(text) {
  const errors = [];
  const lines = String(text)
    .split("\n")
    .map((raw, index) => workflowLine(raw, index + 1))
    .filter((line) => line.content.length > 0);
  const root = { indent: -1, start: -1, end: lines.length };
  const top = mappingEntries(lines, root, errors, "workflow");
  const on = top.get("on");
  const permissionsEntry = top.get("permissions");
  const jobsEntry = top.get("jobs");
  const inputs = new Map();
  const jobs = new Map();
  const permissions = permissionsEntry
    ? mappingObject(lines, permissionsEntry, errors, "permissions")
    : {};

  if (on) {
    const onEntries = mappingEntries(lines, on, errors, "on");
    const dispatch = onEntries.get("workflow_dispatch");
    const dispatchInputs = dispatch
      ? mappingEntries(lines, dispatch, errors, "workflow_dispatch").get(
          "inputs",
        )
      : null;
    if (dispatchInputs) {
      for (const [name, entry] of mappingEntries(
        lines,
        dispatchInputs,
        errors,
        "workflow_dispatch.inputs",
      )) {
        inputs.set(name, mappingObject(lines, entry, errors, `input ${name}`));
      }
    }
  }

  if (jobsEntry) {
    for (const [id, entry] of mappingEntries(
      lines,
      jobsEntry,
      errors,
      "jobs",
    )) {
      const fields = mappingObject(lines, entry, errors, `job ${id}`);
      const entries = mappingEntries(lines, entry, errors, `job ${id}`);
      const stepsEntry = entries.get("steps");
      const steps = stepsEntry
        ? sequenceItems(lines, stepsEntry, errors, `job ${id}.steps`).map(
            (item, index) =>
              stepObject(lines, item, errors, `job ${id}.steps[${index}]`),
          )
        : [];
      jobs.set(id, { id, fields, steps, line: entry.line });
    }
  }

  return { inputs, jobs, permissions, errors };
}

function workflowLine(raw, number) {
  const indent = raw.match(/^\s*/u)?.[0].length ?? 0;
  return {
    raw,
    number,
    indent,
    content: stripComment(raw.slice(indent)).trimEnd(),
  };
}

function stripComment(value) {
  let single = false;
  let double = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "'" && !double) {
      single = !single;
      continue;
    }
    if (character === '"' && !single && value[index - 1] !== "\\") {
      double = !double;
      continue;
    }
    if (
      character === "#" &&
      !single &&
      !double &&
      (index === 0 || /\s/u.test(value[index - 1] ?? ""))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function mappingEntries(lines, parent, errors, label) {
  const children = lines.filter(
    (line, index) =>
      index > parent.start && index < parent.end && line.indent > parent.indent,
  );
  if (children.length === 0) return new Map();
  const directIndent = Math.min(...children.map((line) => line.indent));
  const entries = new Map();
  for (let index = parent.start + 1; index < parent.end; index += 1) {
    const line = lines[index];
    if (!line || line.indent !== directIndent) continue;
    const match = line.content.match(/^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/u);
    if (!match) {
      errors.push(`${label}: unsupported structure at line ${line.number}`);
      continue;
    }
    const key = match[1];
    if (entries.has(key)) {
      errors.push(`${label}: duplicate ${key} at line ${line.number}`);
      continue;
    }
    entries.set(key, {
      key,
      value: scalarValue(match[2] ?? ""),
      indent: line.indent,
      start: index,
      end: blockEnd(lines, index, parent.end, line.indent),
      line: line.number,
    });
  }
  return entries;
}

function mappingObject(lines, parent, errors, label) {
  const values = {};
  for (const [key, entry] of mappingEntries(lines, parent, errors, label)) {
    if (["|", "|-", ">", ">-"].includes(entry.value)) {
      values[key] = blockScalar(lines, entry);
    } else {
      values[key] = entry.value;
    }
    if (key === "env" || key === "with") {
      values[key] = mappingObject(lines, entry, errors, `${label}.${key}`);
    }
  }
  return values;
}

function sequenceItems(lines, parent, errors, label) {
  const children = lines.filter(
    (line, index) =>
      index > parent.start && index < parent.end && line.indent > parent.indent,
  );
  if (children.length === 0) return [];
  const directIndent = Math.min(...children.map((line) => line.indent));
  const items = [];
  for (let index = parent.start + 1; index < parent.end; index += 1) {
    const line = lines[index];
    if (!line || line.indent !== directIndent) continue;
    if (!line.content.startsWith("- ")) {
      errors.push(`${label}: expected a list item at line ${line.number}`);
      continue;
    }
    items.push({
      indent: line.indent,
      start: index,
      end: blockEnd(lines, index, parent.end, line.indent),
      first: line.content.slice(2),
      line: line.number,
    });
  }
  return items;
}

function stepObject(lines, item, errors, label) {
  const values = {};
  const first = item.first.match(/^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/u);
  if (!first) {
    errors.push(`${label}: unsupported list item at line ${item.line}`);
  } else {
    values[first[1]] = scalarValue(first[2] ?? "");
  }

  const children = lines.filter(
    (line, index) =>
      index > item.start && index < item.end && line.indent > item.indent,
  );
  const directIndent =
    children.length > 0
      ? Math.min(...children.map((line) => line.indent))
      : null;
  if (directIndent !== null) {
    for (let index = item.start + 1; index < item.end; index += 1) {
      const line = lines[index];
      if (!line || line.indent !== directIndent) continue;
      const match = line.content.match(/^([A-Za-z0-9_.-]+):(?:\s*(.*))?$/u);
      if (!match) {
        errors.push(`${label}: unsupported field at line ${line.number}`);
        continue;
      }
      const key = match[1];
      if (key in values) {
        errors.push(`${label}: duplicate ${key} at line ${line.number}`);
        continue;
      }
      const entry = {
        key,
        value: scalarValue(match[2] ?? ""),
        indent: line.indent,
        start: index,
        end: blockEnd(lines, index, item.end, line.indent),
        line: line.number,
      };
      if (key === "env" || key === "with") {
        values[key] = mappingObject(lines, entry, errors, `${label}.${key}`);
      } else if (["|", "|-", ">", ">-"].includes(entry.value)) {
        values[key] = blockScalar(lines, entry);
      } else {
        values[key] = entry.value;
      }
    }
  }
  return { ...values, line: item.line };
}

function scalarValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function blockScalar(lines, entry) {
  return lines
    .slice(entry.start + 1, entry.end)
    .filter((line) => line.indent > entry.indent)
    .map((line) => line.content.trim())
    .filter(Boolean)
    .join("\n");
}

function blockEnd(lines, start, parentEnd, indent) {
  for (let index = start + 1; index < parentEnd; index += 1) {
    if (lines[index].indent <= indent) return index;
  }
  return parentEnd;
}
