import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

export type TextProps = RNTextProps & {
  className?: string;
};

export function Text(props: TextProps) {
  const { style, ...rest } = props;
  
  // Flatten styles to inspect fontWeight/fontFamily
  const flatStyle = StyleSheet.flatten(style || {}) as any;
  let fontFamily = 'PlusJakartaSans-Regular';
  
  // Intercept weight and map to family
  if (flatStyle?.fontWeight) {
    const weight = String(flatStyle.fontWeight);
    if (weight === '500') fontFamily = 'PlusJakartaSans-Medium';
    else if (weight === '600' || weight === 'semibold') fontFamily = 'PlusJakartaSans-SemiBold';
    else if (weight === '700' || weight === 'bold') fontFamily = 'PlusJakartaSans-Bold';
    else if (weight === '800' || weight === '900' || weight === 'extrabold') fontFamily = 'PlusJakartaSans-ExtraBold';
  }

  // Allow explicit display/override if set by tailwind font-display or similar
  if (flatStyle?.fontFamily && flatStyle.fontFamily.includes('PlusJakartaSans')) {
    fontFamily = flatStyle.fontFamily;
  }

  // Remove native fontWeight to avoid Android synthesis bugs, and inject concrete fontFamily
  const customStyle = { 
    fontFamily, 
    fontWeight: undefined, // Reset weight
  };

  return <RNText style={[style, customStyle]} {...rest} />;
}
