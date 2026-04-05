# Mr. Rideo Design System

> [!NOTE]
> This document outlines the core design principles and tokens for the "Mr. Rideo" ecosystem. Use this guide to ensure visual consistency across all rider, driver, and internal applications.

## 1. Core Aesthetics

- **Visual Style**: Premium, clean, and high-contrast.
- **Primary Color**: Deep Purple (`#9333EA` / `#7311d4`) used for branding and primary actions.
- **Roundness**: Heavy use of `rounded-2xl` (16px) and `rounded-3xl` (24px) for cards; `rounded-full` for buttons.
- **Depth**: Soft, colored shadows (`shadow-purple-600/30`) to create elevation and a "glow" effect.
- **Typeface**: `Plus Jakarta Sans` for a modern, geometric feel.

---

## 2. Configuration (`tailwind.config.js`)

To implement this system, your Tailwind config should include:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "#7311d4",
        "primary-hover": "#560a8c",
        "primary-light": "#A855F7",
        accent: "#9d4edd",
        "background-light": "#f7f6f8",
        "surface-dark": "#2a2235",
      },
      fontFamily: {
        display: [
          "PlusJakartaSans_400Regular",
          "PlusJakartaSans_500Medium",
          "PlusJakartaSans_700Bold",
          "PlusJakartaSans_800ExtraBold",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(157, 78, 221, 0.5)",
      },
    },
  },
};
```

---

## 3. Color Palette

### Primary Brand

| Variable       | Hex       | Usage                         |
| :------------- | :-------- | :---------------------------- |
| `primary`      | `#7311d4` | Main brand color              |
| `joy-purple`   | `#8B5CF6` | Vibrant accents               |
| `accent`       | `#9d4edd` | Highlights, secondary actions |
| `bg-purple-50` | `#FAF5FF` | Active states backgrounds     |

### Neutrals

| Variable           | Hex       | Usage                  |
| :----------------- | :-------- | :--------------------- |
| `background-light` | `#f7f6f8` | Page backgrounds       |
| `gray-900`         | `#111827` | Headings, primary text |
| `gray-500`         | `#6B7280` | Body text, help text   |
| `border-gray-200`  | `#E5E7EB` | Dividers, card borders |

### Semantic Status

| Status                  | Text Color        | Background      |
| :---------------------- | :---------------- | :-------------- |
| **Success / Completed** | `text-green-700`  | `bg-green-100`  |
| **Error / Cancelled**   | `text-red-600`    | `bg-red-100`    |
| **Active / Info**       | `text-purple-600` | `bg-purple-100` |

---

## 4. Typography

**Font Family**: `Plus Jakarta Sans` (`font-display`)

| Element             | Class                                            | Specs |
| :------------------ | :----------------------------------------------- | :---- |
| **Display Heading** | `text-4xl font-extrabold tracking-tight`         | ~36px |
| **Page Title**      | `text-2xl font-extrabold`                        | ~24px |
| **Card Title**      | `text-lg font-bold`                              | ~18px |
| **Body Text**       | `text-sm font-medium text-gray-600`              | ~14px |
| **Captions/Labels** | `text-[10px] font-bold uppercase tracking-wider` | ~10px |

---

## 5. UI Components

### Buttons

**Primary Button**

- **Shape**: `rounded-full` or `rounded-[2rem]`
- **Height**: `h-16` (large), `h-12` (medium)
- **Style**: `bg-purple-900` text white
- **Shadow**: `shadow-lg shadow-purple-600/30`

```jsx
<TouchableOpacity className="w-full h-16 bg-purple-900 rounded-[2rem] flex-row items-center justify-center shadow-lg shadow-purple-600/30">
  <Text className="text-white text-lg font-bold font-display">Action</Text>
</TouchableOpacity>
```

**Filter/Pill Button**

- **Inactive**: `bg-gray-100 border border-gray-200 text-gray-600`
- **Active**: `bg-[#9333EA] text-white shadow-lg`

```jsx
<View className="px-5 py-2 rounded-full bg-[#9333EA] shadow-lg shadow-purple-600/30">
  <Text className="text-white font-bold text-sm">Selected</Text>
</View>
```

### Cards

**Standard Card**

- **Background**: `bg-white`
- **Border**: `border border-gray-100` (subtle) or `border-gray-200`
- **Shadow**: `shadow-sm` or `shadow-lg` for elevation
- **Radius**: `rounded-2xl`

```jsx
<View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
  {/* Content */}
</View>
```

**Service Selection Card** (e.g. Uber/Grab style)

- **Default**: `bg-white border-gray-200`
- **Selected**: `bg-purple-50 border-purple-600 shadow-purple-600/10`

```jsx
<TouchableOpacity className="rounded-3xl p-4 bg-purple-50 border border-purple-600">
  <Text className="text-purple-900 font-bold">Service Name</Text>
</TouchableOpacity>
```

### Inputs & Search

**Search Bar**

- **Style**: `bg-gray-50 backdrop-blur-xl border border-gray-200 rounded-3xl p-4`
- **Icon**: Left icon in `w-10 h-10 rounded-full bg-purple-100` container

---

## 6. Iconography

- **Set**: Material Icons (`@expo/vector-icons/MaterialIcons`)
- **Size**: Typically `size={24}`
- **Active Color**: `#9333EA` (Purple)
- **Inactive Color**: `#9CA3AF` (Gray 400) or `#4B5563` (Gray 600)

## 7. Gradients & Effects

- **Primary Gradient**: `['#9333EA', '#7E22CE']` (Purple to darker purple)
- **Glow Effect**: Use `shadow-purple-600/30` or opacity layers (e.g., `bg-purple-900 rounded-full opacity-75`).
