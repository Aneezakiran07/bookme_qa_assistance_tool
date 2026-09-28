<script setup lang="ts">
// lightweight markdown-style editor for test steps, expected results, and
// bug descriptions. built on plain Textarea (no extra rich-text package
// dependency) with a small toolbar that inserts markdown syntax, and a
// live preview toggle so testers can check formatting before saving.
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    rows?: number
  }>(),
  {
    placeholder: 'Describe the steps, expected result, or issue...',
    rows: 6
  }
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

// a plain <textarea> is used (not PrimeVue's Textarea wrapper) specifically
// so this ref is a real DOM node with selectionStart/selectionEnd/focus —
// exactly what the toolbar buttons below need to insert markdown at the cursor
const textareaRef = ref<HTMLTextAreaElement>()
const showPreview = ref(false)

function wrapSelection(prefix: string, suffix = prefix) {
  const el = textareaRef.value
  if (!el) return
  const { selectionStart, selectionEnd, value } = el
  const selected = value.slice(selectionStart, selectionEnd)
  const next = `${value.slice(0, selectionStart)}${prefix}${selected}${suffix}${value.slice(selectionEnd)}`
  emit('update:modelValue', next)
  nextTick(() => {
    el.focus()
    el.setSelectionRange(selectionStart + prefix.length, selectionEnd + prefix.length)
  })
}

function insertLinePrefix(prefix: string) {
  const el = textareaRef.value
  if (!el) return
  const { selectionStart, value } = el
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`
  emit('update:modelValue', next)
}

// intentionally minimal: bold, italic, and a numbered/bulleted step —
// the three formats testers actually reach for when writing steps
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const previewHtml = computed(() =>
  escapeHtml(props.modelValue ?? '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
)
</script>

<template>
  <div class="rounded-md border border-black/10 dark:border-white/10">
    <div class="flex items-center gap-1 border-b border-black/10 p-1.5 dark:border-white/10">
      <button type="button" class="toolbar-btn" title="Bold" @click="wrapSelection('**')">
        <i class="pi pi-bold text-xs" />
      </button>
      <button type="button" class="toolbar-btn" title="Italic" @click="wrapSelection('*')">
        <i class="pi pi-italic text-xs" />
      </button>
      <button type="button" class="toolbar-btn" title="Numbered step" @click="insertLinePrefix('1. ')">
        <i class="pi pi-list-check text-xs" />
      </button>
      <button
        type="button"
        class="toolbar-btn ml-auto"
        :class="{ '!text-purple-600 dark:!text-purple-400': showPreview }"
        title="Toggle preview"
        @click="showPreview = !showPreview"
      >
        <i class="pi pi-eye text-xs" />
      </button>
    </div>

    <textarea
      v-if="!showPreview"
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      class="w-full resize-y border-0 bg-transparent p-3 text-sm text-gray-900
             placeholder:text-gray-400 dark:text-white dark:placeholder:text-white/40
             focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-400"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div
      v-else
      class="min-h-[6rem] p-3 text-sm text-gray-800 dark:text-white/80"
      v-html="previewHtml"
    />
  </div>
</template>

<style scoped>
.toolbar-btn {
  @apply flex h-7 w-7 items-center justify-center rounded text-gray-500
    hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10
    focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400;
}
</style>
