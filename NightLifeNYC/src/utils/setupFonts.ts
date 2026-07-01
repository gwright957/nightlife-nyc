import React from "react";
import { StyleSheet, Text, TextInput, TextStyle } from "react-native";
import { flattenStyle, resolveFontFamily, ICON_FONTS } from "./fonts";

type TextLike = typeof Text | typeof TextInput;

function patchTextComponent(Component: TextLike) {
  const originalRender = Component.render;
  if (!originalRender) {
    return;
  }

  // @ts-expect-error React Native internal render patch
  Component.render = function renderWithFont(props, ref) {
    const flat = flattenStyle(props.style as TextStyle | TextStyle[] | undefined);
    const family = resolveFontFamily(flat?.fontWeight, flat?.fontFamily);

    if (ICON_FONTS.has(family)) {
      return originalRender.call(this, props, ref);
    }

    return originalRender.call(
      this,
      {
        ...props,
        style: [props.style, { fontFamily: family, fontWeight: "normal" }],
      },
      ref,
    );
  };
}

export function setupFonts() {
  patchTextComponent(Text);
  patchTextComponent(TextInput);
}
