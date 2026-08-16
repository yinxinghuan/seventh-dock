const specs = ['persistence.mjs', 'item-images.mjs', 'i18n.mjs', 'avatar.mjs', 'choice-recovery.mjs', 'restart-world.mjs']

for (const spec of specs) {
  await import(`./${spec}`)
}

console.log(`browser suite ok · ${specs.length} specs`)
