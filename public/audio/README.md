# Intro theme music

Drop a file here named `draft-theme` with any of these extensions and the intro
will pick it up automatically:

    draft-theme.mp3    draft-theme.m4a    draft-theme.ogg    draft-theme.wav

They are tried in that order. If none is present the intro is silent and no audio
control is rendered at all — nothing breaks.

Two things worth knowing:

- **Browsers block autoplay with sound** until the visitor interacts with the page.
  The intro runs on page load, so on a first visit the music will not start on its
  own. The intro shows a "Sound off" button in that case; one tap starts it, and it
  fades in. Returning visits in the same session often autoplay fine.
- **Use audio you have the right to publish.** This site is public. The NFL's draft
  theme is commercial copyrighted music; putting it on a public page is a licensing
  question, not a technical one. A royalty-free alternative avoids that entirely.

Keep it under a few MB — it downloads during the intro.
