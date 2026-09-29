<script setup lang="ts">
// standalone confirmation modal for destructive actions (deleting a
// module, removing a requirement, deactivating a user, etc). the file
// and component are named AppConfirmDialog, not ConfirmDialog, because
// PrimeVue itself ships a built-in global component literally called
// ConfirmDialog, and with this app's flat component naming
// (pathPrefix: false) a file named ConfirmDialog.vue would auto-import
// as <ConfirmDialog> and collide with PrimeVue's own, silently shadowing
// one another. place one instance per page, give it a ref, and call
// `confirmRef.open({ title, message })` — it resolves to true/false
// depending on what the user clicked.
export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const visible = ref(false)
const options = ref<ConfirmOptions>({ message: '' })
let resolver: ((value: boolean) => void) | null = null

function open(opts: ConfirmOptions): Promise<boolean> {
  options.value = opts
  visible.value = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

function resolveAndClose(result: boolean) {
  visible.value = false
  resolver?.(result)
  resolver = null
}

defineExpose({ open })
</script>

<template>
  <BaseModal v-model="visible" :title="options.title ?? 'Are you sure?'" width="26rem">
    <p>{{ options.message }}</p>

    <template #footer>
      <BaseButton variant="secondary" label="Cancel" @click="resolveAndClose(false)" />
      <BaseButton
        :variant="options.danger ? 'danger' : 'primary'"
        :label="options.confirmLabel ?? 'Confirm'"
        @click="resolveAndClose(true)"
      />
    </template>
  </BaseModal>
</template>