# Storybook

Le stories devono mostrare i componenti reali, uno per file quando possibile.

Regole:

- usare `component`, `args` e `argTypes` per abilitare Controls;
- non creare pagine demo composite o varianti estetiche non presenti nel componente;
- usare solo wrapper minimi quando servono dimensione, provider o children obbligatori;
- usare mock realistici ma modificabili dal pannello Controls.

Avvio:

```bash
npm run storybook
```
