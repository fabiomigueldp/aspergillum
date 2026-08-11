import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { assertInside } from "./artifact-cache.mjs";

function token() {
  return `${process.pid}-${randomBytes(5).toString("hex")}`;
}

export class FileTransaction {
  constructor(scopeRoot) {
    this.scopeRoot = path.resolve(scopeRoot);
    this.rollbackActions = [];
    this.commitActions = [];
    this.finished = false;
  }

  replaceDirectory(source, target) {
    if (this.finished) throw new Error("Transação já encerrada.");
    const destination = assertInside(this.scopeRoot, target, "dados Bedrock");
    const parent = path.dirname(destination);
    fs.mkdirSync(parent, { recursive: true });
    const id = token();
    const staged = assertInside(this.scopeRoot, path.join(parent, `.${path.basename(destination)}.stage-${id}`), "dados Bedrock");
    const previous = assertInside(this.scopeRoot, path.join(parent, `.${path.basename(destination)}.previous-${id}`), "dados Bedrock");
    try {
      fs.cpSync(source, staged, { recursive: true, errorOnExist: true, force: false });
    } catch (error) {
      fs.rmSync(staged, { recursive: true, force: true });
      throw error;
    }
    const existed = fs.existsSync(destination);
    try {
      if (existed) fs.renameSync(destination, previous);
      fs.renameSync(staged, destination);
    } catch (error) {
      fs.rmSync(staged, { recursive: true, force: true });
      if (existed && fs.existsSync(previous) && !fs.existsSync(destination)) fs.renameSync(previous, destination);
      throw error;
    }
    this.rollbackActions.unshift(() => {
      fs.rmSync(destination, { recursive: true, force: true });
      if (existed && fs.existsSync(previous)) fs.renameSync(previous, destination);
    });
    this.commitActions.push(() => fs.rmSync(previous, { recursive: true, force: true }));
  }

  writeJson(filePath, value) {
    if (this.finished) throw new Error("Transação já encerrada.");
    const destination = assertInside(this.scopeRoot, filePath, "dados Bedrock");
    const existed = fs.existsSync(destination);
    const previous = existed ? fs.readFileSync(destination) : undefined;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${token()}.tmp`;
    try {
      fs.writeFileSync(temporary, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
      fs.renameSync(temporary, destination);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
    this.rollbackActions.unshift(() => {
      if (existed) fs.writeFileSync(destination, previous);
      else fs.rmSync(destination, { force: true });
    });
  }

  commit() {
    if (this.finished) return;
    for (const action of this.commitActions) action();
    this.finished = true;
    this.rollbackActions = [];
    this.commitActions = [];
  }

  rollback() {
    if (this.finished) return;
    const errors = [];
    for (const action of this.rollbackActions) {
      try { action(); } catch (error) { errors.push(error); }
    }
    this.finished = true;
    this.rollbackActions = [];
    this.commitActions = [];
    if (errors.length > 0) throw new AggregateError(errors, "Falha ao reverter a instalação.");
  }
}
