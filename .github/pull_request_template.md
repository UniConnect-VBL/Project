## 🎯 What does this PR do?

<!-- Mô tả ngắn gọn thay đổi -->

## 📸 Screenshots (nếu có UI changes)

<!-- Attach screenshots hoặc xóa section này -->

## 🔗 Related Issues

<!--
Closes #123
Fixes #456
-->

## ⚠️ Breaking Changes

- [ ] Có breaking changes

<!-- Nếu có, mô tả chi tiết: -->

## 🧪 How to Test

<!-- Các bước test thay đổi này -->

1.
2.
3.

## 📋 Checklist

### Code Quality

- [ ] Code đã chạy được locally
- [ ] Không có lỗi TypeScript (`pnpm lint`)
- [ ] Tuân thủ .rules coding standards

### Database (nếu có thay đổi)

- [ ] Queries filter `deleted_at IS NULL`
- [ ] Dùng Soft Delete thay vì Hard Delete
- [ ] Multi-tenant filter `school_id`
- [ ] Wallet balance update có kèm `wallet_logs` record

### API (nếu có endpoint mới)

- [ ] Dùng `ErrorCodes` thay vì hardcoded strings
- [ ] Controller chỉ handle HTTP, logic trong Service
- [ ] Đã thêm types vào `packages/types`
- [ ] Đã thêm Zod Schemas vào `packages/shared`
- [ ] Đã check `x-idempotency-key` cho mutation quan trọng
- [ ] Upload sử dụng luồng R2 Presigned URL

### Git

- [ ] Branch đã rebase với `develop` mới nhất
- [ ] Commit messages theo format `type(scope): message`

### Async Workers (nếu có background jobs)

- [ ] Worker sử dụng BullMQ
- [ ] Có implement Exponential Backoff retry
- [ ] Có xử lý Dead Letter Queue (DLQ)

## 📝 Notes for Reviewers

<!-- Anything else reviewers should know? -->
