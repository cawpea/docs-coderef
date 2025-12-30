/**
 * Code ellipsis display utility
 */

import * as fs from 'fs';

import { parse as parseTypeScript } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

import { isTypeScriptOrJavaScript } from '@/utils/ast-symbol-search';

const ELLIPSIS = '  // ... (omitted) ...';

/**
 * Class member information
 */
interface ClassMember {
  name: string;
  startLine: number;
  endLine: number;
  type: 'method' | 'property' | 'constructor';
}

/**
 * Find class node from AST
 */
function findClassNode(fileContent: string, className: string): TSESTree.ClassDeclaration | null {
  const ast = parseTypeScript(fileContent, {
    loc: true,
    range: true,
    jsx: fileContent.includes('tsx') || fileContent.includes('jsx'),
  });

  function visit(node: TSESTree.Node): TSESTree.ClassDeclaration | null {
    if (node.type === 'ClassDeclaration' && node.id?.name === className) {
      return node;
    }

    // Recursively explore child nodes
    const keys = Object.keys(node) as (keyof TSESTree.Node)[];
    for (const key of keys) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child === 'object' && 'type' in child) {
              const found = visit(child as TSESTree.Node);
              if (found) return found;
            }
          }
        } else if ('type' in value) {
          const found = visit(value as TSESTree.Node);
          if (found) return found;
        }
      }
    }

    return null;
  }

  return visit(ast);
}

/**
 * Get members in class
 */
function getClassMembers(classNode: TSESTree.ClassDeclaration): ClassMember[] {
  const members: ClassMember[] = [];

  if (!classNode.body?.body) {
    return members;
  }

  for (const member of classNode.body.body) {
    if (!member.loc) continue;

    if (member.type === 'MethodDefinition') {
      const name =
        member.key.type === 'Identifier'
          ? member.key.name
          : member.kind === 'constructor'
            ? 'constructor'
            : 'unknown';

      members.push({
        name,
        startLine: member.loc.start.line,
        endLine: member.loc.end.line,
        type: member.kind === 'constructor' ? 'constructor' : 'method',
      });
    } else if (member.type === 'PropertyDefinition') {
      const name = member.key.type === 'Identifier' ? member.key.name : 'unknown';

      members.push({
        name,
        startLine: member.loc.start.line,
        endLine: member.loc.end.line,
        type: 'property',
      });
    }
  }

  return members;
}

/**
 * Get start line including JSDoc comment
 */
function getStartLineWithJSDoc(startLine: number, lines: string[]): number {
  // Search for JSDoc upward from before start line
  for (let i = startLine - 2; i >= 0; i--) {
    const line = lines[i].trim();

    // If found JSDoc end (*/)
    if (line.endsWith('*/')) {
      // Search further upward for JSDoc start (/**)
      for (let j = i; j >= 0; j--) {
        const docLine = lines[j].trim();
        if (docLine.startsWith('/**')) {
          return j + 1; // 1-indexed
        }
      }
      break;
    }

    // End if found non-empty, non-comment line
    if (line.length > 0 && !line.startsWith('//')) {
      break;
    }
  }

  return startLine;
}

/**
 * Insert ellipsis in code
 */
export function insertEllipsis(
  filePath: string,
  options: {
    className?: string;
    memberName: string;
  }
): string {
  // Only TypeScript/JavaScript files
  if (!isTypeScriptOrJavaScript(filePath)) {
    throw new Error('TypeScript/JavaScript files only');
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  if (options.className) {
    // Display only methods in class
    const classNode = findClassNode(fileContent, options.className);
    if (!classNode?.loc) {
      // If class not found, return original file content
      return fileContent;
    }

    const result: string[] = [];
    const members = getClassMembers(classNode);

    // Get class declaration line (export class ClassName { line)
    const classStartLine = classNode.loc.start.line;
    const classEndLine = classNode.loc.end.line;

    // Add class declaration start line
    result.push(lines[classStartLine - 1]);

    let lastEndLine = classStartLine;
    let hasAddedEllipsis = false;

    for (const member of members) {
      if (member.name === options.memberName) {
        // Target method: Display fully including JSDoc comment
        const memberStartWithJSDoc = getStartLineWithJSDoc(member.startLine, lines);

        // Insert ellipsis between previous member (if not yet added)
        if (lastEndLine < memberStartWithJSDoc && !hasAddedEllipsis) {
          result.push('');
          result.push(ELLIPSIS);
          result.push('');
          hasAddedEllipsis = true;
        }

        // Add target method
        for (let i = memberStartWithJSDoc - 1; i < member.endLine; i++) {
          result.push(lines[i]);
        }

        lastEndLine = member.endLine;
        hasAddedEllipsis = false;
      } else {
        // Other members: Omit (ellipsis added only once)
        if (!hasAddedEllipsis && lastEndLine < member.endLine) {
          hasAddedEllipsis = true;
        }
        lastEndLine = member.endLine;
      }
    }

    // Add ellipsis after last member (if needed)
    if (hasAddedEllipsis && lastEndLine < classEndLine - 1) {
      result.push('');
      result.push(ELLIPSIS);
      result.push('');
    }

    // Add class closing bracket
    result.push(lines[classEndLine - 1]);

    return result.join('\n');
  } else {
    // Display function only (omit surrounding context)
    // In this case, return only the range found by symbol search
    // Add if implementation needed
    return fileContent;
  }
}

/**
 * Remove ellipsis from ellipsis-displayed code
 */
export function removeEllipsis(code: string): string {
  return code
    .split('\n')
    .filter((line) => !line.trim().includes('// ... (omitted) ...'))
    .join('\n');
}
