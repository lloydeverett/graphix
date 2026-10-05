import { type Locator } from '@playwright/test';
import { type Editor, expect, test, treeNodeSource } from './fixtures.js';

/** A Tree whose root, labelled Root, holds `children`. */
const tree = (children: string[], rootAttributes = '') =>
  `<gx-tree-node label="Root"${rootAttributes}>\n${children.map((child) => `  ${child}\n`).join('')}</gx-tree-node>`;

const CHILDREN = [treeNodeSource('Child A'), treeNodeSource('Child B', '<a href="#b">more</a>')];

const treeNode = (editor: Editor, label: string) => editor.preview.locator(`gx-tree-node[label="${label}"]`);

/** A Tree Node's own card; the cards of the Tree Nodes nested in it come after. */
const card = (treeNode: Locator) => treeNode.locator('.card').first();

/** The Tree's edges, drawn by its root. */
const edges = (editor: Editor) => treeNode(editor, 'Root').locator('.edges > path');

async function cardBox(treeNode: Locator) {
  const box = await card(treeNode).boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function centre({ x, width }: { x: number; width: number }) {
  return x + width / 2;
}

test('lays out a Tree with each child below its parent, in order', async ({ editor }) => {
  await editor.setSource(tree(CHILDREN));
  const [root, a, b] = ['Root', 'Child A', 'Child B'].map((label) => treeNode(editor, label));
  await expect(card(b)).toBeVisible();
  await expect(edges(editor)).toHaveCount(2);

  const [rootBox, aBox, bBox] = await Promise.all([cardBox(root), cardBox(a), cardBox(b)]);
  expect(aBox.y).toBeGreaterThan(rootBox.y + rootBox.height);
  expect(bBox.y).toBeGreaterThan(rootBox.y + rootBox.height);
  expect(aBox.x + aBox.width).toBeLessThan(bBox.x);
  expect(centre(rootBox)).toBeGreaterThan(centre(aBox));
  expect(centre(rootBox)).toBeLessThan(centre(bBox));
});

test('keeps Tree Node content as real, interactive elements', async ({ editor }) => {
  await editor.setSource(tree(CHILDREN));
  await editor.preview.getByRole('link', { name: 'more' }).click();
  await expect.poll(() => editor.inPreview(() => location.hash)).toBe('#b');
});

test('lays out again when a Tree Node is added, keeping the others', async ({ editor }) => {
  await editor.setSource(tree(CHILDREN));
  await expect(edges(editor)).toHaveCount(2);
  await editor.mark('gx-tree-node[label="Child A"]');

  await editor.setSource(tree([...CHILDREN, treeNodeSource('Child C')]));
  await expect(edges(editor)).toHaveCount(3);
  const c = treeNode(editor, 'Child C');
  await expect(card(c)).toBeVisible();
  expect(await editor.isMarked('gx-tree-node[label="Child A"]')).toBe(true);

  const [bBox, cBox] = await Promise.all([cardBox(treeNode(editor, 'Child B')), cardBox(c)]);
  expect(bBox.x + bBox.width).toBeLessThan(cBox.x);
});

test('lays out again when a Tree Node grows', async ({ editor }) => {
  await editor.setSource(tree([treeNodeSource('Child A', 'a'), treeNodeSource('Child B')]));
  const a = treeNode(editor, 'Child A');
  const b = treeNode(editor, 'Child B');
  await expect(card(b)).toBeVisible();
  const narrow = await cardBox(a);
  await editor.mark('gx-tree-node[label="Child A"]');

  // Edits the text in place, which only changes Child A's size.
  await editor.setSource(tree([treeNodeSource('Child A', 'a much longer line of content'), treeNodeSource('Child B')]));
  await expect(a).toContainText('a much longer line of content');
  expect(await editor.isMarked('gx-tree-node[label="Child A"]')).toBe(true);
  await expect(async () => {
    const [aBox, bBox] = await Promise.all([cardBox(a), cardBox(b)]);
    expect(aBox.width).toBeGreaterThan(narrow.width);
    expect(aBox.x + aBox.width).toBeLessThan(bBox.x);
  }).toPass();
});

test('grows the Tree in its direction', async ({ editor }) => {
  await editor.setSource(tree(CHILDREN, ' direction="right"'));
  const root = treeNode(editor, 'Root');
  const a = treeNode(editor, 'Child A');
  await expect(card(a)).toBeVisible();
  await expect(async () => {
    const [rootBox, aBox] = await Promise.all([cardBox(root), cardBox(a)]);
    expect(aBox.x).toBeGreaterThan(rootBox.x + rootBox.width);
  }).toPass();
});
