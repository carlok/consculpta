// SPDX-License-Identifier: Apache-2.0
/**
 * @typedef {object} FormulaNode
 * @property {string} op
 * @property {number} [v]
 * @property {number[]} [p]
 * @property {FormulaNode[]} [c]
 * @property {number} [raw]
 */

/**
 * @typedef {object} Genome
 * @property {FormulaNode} t
 * @property {FormulaNode} c
 * @property {number[]} v
 */

/**
 * @typedef {object} ViabilityResult
 * @property {boolean} ok
 * @property {string} why
 * @property {number} [occ]
 */

export {};
