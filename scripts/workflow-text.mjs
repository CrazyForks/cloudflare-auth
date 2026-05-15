export function workflowInputBlock(text, inputName) {
  return workflowIndentedBlock(text, `${inputName}:`, {
    stopOnSiblingListItem: false,
  });
}

export function workflowNamedStepBlock(text, stepName) {
  return workflowIndentedBlock(text, `- name: ${stepName}`, {
    stopOnSiblingListItem: true,
  });
}

export function blockHasTrimmedLine(block, expectedLine) {
  return block.split("\n").some((line) => line.trim() === expectedLine);
}

function workflowIndentedBlock(
  text,
  startTrimmedLine,
  { stopOnSiblingListItem },
) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === startTrimmedLine);
  if (start === -1) return "";
  const indent = workflowLineIndent(lines[start]);
  const block = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().length === 0) {
      block.push(line);
      continue;
    }
    const lineIndent = workflowLineIndent(line);
    if (lineIndent < indent) break;
    if (
      stopOnSiblingListItem &&
      lineIndent <= indent &&
      line.trim().startsWith("- ")
    ) {
      break;
    }
    if (!stopOnSiblingListItem && lineIndent <= indent) break;
    block.push(line);
  }
  return block.join("\n");
}

function workflowLineIndent(line) {
  return line.match(/^\s*/u)?.[0].length ?? 0;
}
