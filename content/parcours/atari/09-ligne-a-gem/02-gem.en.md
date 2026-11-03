## The AES and the VDI

GEM, the ST's graphical interface with its windows, menus and dialog boxes, is made of two parts.
The AES handles windows, menus, dialogs and events, while the VDI draws lines, circles and text,
whatever the screen or printer.

You call both with `TRAP #2`, with the part being called in D0, `$C8` for the AES and `$73` for the
VDI, and in D1 the address of a **parameter block**, a list of array addresses.

## A call to the AES

For the AES, the block holds six addresses, those of the CONTROL, GLOBAL, INT_IN, INT_OUT, ADDR_IN
and ADDR_OUT arrays. The CONTROL array describes the call: its first word is the function number,
and the next four the number of elements of INT_IN, INT_OUT, ADDR_IN and ADDR_OUT. The main result
comes back in INT_OUT[0].

| Function | No. | CONTROL | Role |
|---|---|---|---|
| `appl_init` | 10 | 10, 0, 1, 0, 0 | announce yourself to GEM; INT_OUT[0] = application identifier |
| `form_alert` | 52 | 52, 1, 1, 1, 0 | display an alert box; INT_OUT[0] = button clicked |
| `graf_handle` | 77 | 77, 0, 5, 0, 0 | INT_OUT[0] = number of the screen's VDI workstation |
| `appl_exit` | 19 | 19, 0, 1, 0, 0 | hand control back to GEM |

A GEM program starts with `appl_init` and ends with `appl_exit`.

## The alert box

`form_alert` displays a box with an icon, a few lines of text and up to three buttons, then waits
for a click and returns in INT_OUT[0] the number of the chosen button, from 1 to 3. INT_IN[0] gives
the default button, the one the Return key confirms, and ADDR_IN[0] the address of the text, which
follows a precise format:

```text
[1][Bonjour depuis le GEM|Seconde ligne][ OK | Annuler ]
```

The first bracket gives the icon: 0 for none, 1 for the exclamation mark, 2 for the question mark
and 3 for the stop sign. The second contains the lines separated by `|`, at most five of thirty
characters, and the third the buttons, three at most.

## What 68k Trainer simulates

The simulator knows `appl_init`, `appl_exit`, `form_alert`, `graf_handle` and `graf_mouse`. The
alert box is displayed in the text output, and the exercise chooses the button clicked; without
any indication, it is the default button. The VDI and the rest of the AES can be explored in
Hatari.
