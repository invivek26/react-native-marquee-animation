# Example font

The example embeds Inter 400 and 600 at native build time from
`@expo-google-fonts/inter` using the `expo-font` config plugin. This avoids an
empty first render and ensures marquee measurement never happens before the
font is available. The package is MIT-licensed and its font files use the SIL
Open Font License 1.1.

A consuming app can embed its licensed custom fonts with the same config plugin
and pass the resolved native family through the marquee's typography prop.
