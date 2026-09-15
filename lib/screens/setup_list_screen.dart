import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/tuning_setup.dart';
import '../state/setup_store.dart';
import 'setup_detail_screen.dart';
import 'setup_form_screen.dart';

class SetupListScreen extends StatefulWidget {
  const SetupListScreen({super.key});

  @override
  State<SetupListScreen> createState() => _SetupListScreenState();
}

class _SetupListScreenState extends State<SetupListScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final store = context.watch<SetupStore>();
    final setups = store.setups
        .where((setup) => setup.carName.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('GT7 Tuning Setups')),
      body: store.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Zoek op auto...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (value) => setState(() => _query = value),
                  ),
                ),
                Expanded(
                  child: setups.isEmpty
                      ? _EmptyState(hasQuery: _query.isNotEmpty)
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
                          itemCount: setups.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final setup = setups[index];
                            return _SetupTile(
                              setup: setup,
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => SetupDetailScreen(setupId: setup.id),
                                ),
                              ),
                              onDelete: () => _confirmDelete(context, setup),
                            );
                          },
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SetupFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Nieuwe setup'),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, TuningSetup setup) async {
    final store = context.read<SetupStore>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Setup verwijderen?'),
        content: Text('"${setup.carName}" wordt permanent verwijderd.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuleren'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Verwijderen'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await store.delete(setup.id);
    }
  }
}

class _SetupTile extends StatelessWidget {
  const _SetupTile({required this.setup, required this.onTap, required this.onDelete});

  final TuningSetup setup;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(setup.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onDelete();
        return false;
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(Icons.delete, color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      child: Card(
        margin: EdgeInsets.zero,
        child: ListTile(
          title: Text(setup.carName, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(
            [
              if (setup.trackOrConditions?.isNotEmpty ?? false) setup.trackOrConditions!,
              'Bijgewerkt ${_formatDate(setup.updatedAt)}',
            ].join(' • '),
          ),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      ),
    );
  }

  static String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'vandaag';
    if (diff.inDays == 1) return 'gisteren';
    if (diff.inDays < 7) return '${diff.inDays} dagen geleden';
    return '${date.day.toString().padLeft(2, '0')}-${date.month.toString().padLeft(2, '0')}-${date.year}';
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.speed, size: 48, color: Theme.of(context).colorScheme.outline),
            const SizedBox(height: 16),
            Text(
              hasQuery ? 'Geen setups gevonden' : 'Nog geen tuning-setups',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            if (!hasQuery)
              Text(
                'Tik op + om je eerste GT7-tuning-setup op te slaan.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
          ],
        ),
      ),
    );
  }
}
