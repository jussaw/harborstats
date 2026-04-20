export function rankWithTies<T>(items: T[], value: (item: T) => number): number[] {
  const ranks: number[] = []

  items.forEach((item, index) => {
    if (index === 0) {
      ranks.push(1)
      return
    }

    if (value(items[index - 1]) === value(item)) {
      ranks.push(ranks[index - 1])
      return
    }

    ranks.push(index + 1)
  })

  return ranks
}
